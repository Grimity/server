import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RedisService } from 'src/database/redis/redis.service';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import type { NewChatMessageEventResponse } from '../chat/dto';
import { NotificationResponse } from '../notification/dto';
import { OnModuleDestroy } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class GlobalGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private pubRedis: Redis;
  private socketUserMap = new Map<string, string>(); // socketId -> userId

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.pubRedis = redisService.pubClient;
  }

  async handleConnection(client: Socket, ...args: any[]) {
    // jwt
    const token = client.handshake.auth?.accessToken;

    if (!token) {
      client.emit('error', {
        statusCode: 401,
        message: 'No token provided',
      });
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
    } catch (e) {
      client.emit('error', {
        statusCode: 401,
        message: 'Invalid token',
      });
      client.disconnect();
      return;
    }

    const userId = client.data.user.id as string;
    this.socketUserMap.set(client.id, userId);
    // 유저별 클라이언트 개수
    await this.pubRedis.incr(`user:${userId}:clientCount`);

    // 클라이언트 개수 expire
    await this.pubRedis.expire(`user:${userId}:clientCount`, 60 * 60 * 2); // TTL 2시간

    await this.redisService.subscribe(`user:${userId}`);
    await client.join(`user:${userId}`);

    client.emit('connected', {
      socketId: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    // room 정보는 알아서 없어짐
    try {
      const userId = this.socketUserMap.get(client.id);
      await this.redisService.unSubscribe(`user:${userId}`);
      await this.pubRedis.decr(`user:${userId}:clientCount`);

      this.socketUserMap.delete(client.id);
      // await this.pubRedis.del(`socket:user:${client.id}`);
    } catch (e) {
      if (this.configService.get('NODE_ENV') !== 'production') return;
      throw e;
    }
  }

  async onModuleDestroy() {
    this.server.disconnectSockets();
  }

  async isOnline(userId: string) {
    const count = await this.pubRedis.get(`user:${userId}:clientCount`);
    return count !== null && Number(count) > 0;
  }

  async joinChat(userId: string, chatId: string) {
    await this.pubRedis.incr(`chat:${chatId}:user:${userId}:count`);
    await this.pubRedis.expire(
      `chat:${chatId}:user:${userId}:count`,
      60 * 60 * 2,
    ); // TTL 2시간
  }

  async leaveChat(userId: string, chatId: string) {
    await this.pubRedis.decr(`chat:${chatId}:user:${userId}:count`);
  }

  async isUserInChat(userId: string, chatId: string) {
    const count = await this.pubRedis.get(
      `chat:${chatId}:user:${userId}:count`,
    );
    return count !== null && Number(count) > 0;
  }

  emitMessageEventToUser(userId: string, dto: NewChatMessageEventResponse) {
    this.server.to(`user:${userId}`).emit('newChatMessage', dto);
  }

  emitDeleteChatEventToUser(userId: string, chatIds: string[]) {
    this.server.to(`user:${userId}`).emit('deleteChat', chatIds);
  }

  emitLikeChatMessageEventToChat(chatId: string, chatMessageId: string) {
    this.server.to(`chat:${chatId}`).emit('likeChatMessage', chatMessageId);
  }

  emitUnlikeChatMessageEventToChat(chatId: string, chatMessageId: string) {
    this.server.to(`chat:${chatId}`).emit('unlikeChatMessage', chatMessageId);
  }

  emitNewNotificationToUser(userId: string, dto: NotificationResponse) {
    this.server.to(`user:${userId}`).emit('newNotification', dto);
  }
}
