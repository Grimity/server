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
  private userSocketMap: Map<string, Set<string>> = new Map(); // userId -> socketId set

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
      client.data.user = payload as {
        id: string;
      };
    } catch (e) {
      client.emit('error', {
        statusCode: 401,
        message: 'Invalid token',
      });
      client.disconnect();
      return;
    }

    const userId = client.data.user.id as string;

    await client.join(`user:${userId}`);
    this.userSocketMap.set(
      userId,
      (this.userSocketMap.get(userId) ?? new Set()).add(client.id),
    );
    await this.redisService.subscribe(`user:${userId}`);

    client.emit('connected', {
      socketId: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    // room 정보는 알아서 없어짐
    try {
      const userId = client.data.user.id as string;

      const userSockets = this.userSocketMap.get(userId);
      if (!userSockets) throw new Error('No sockets for user');

      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.userSocketMap.delete(userId);
        await this.redisService.unSubscribe(`user:${userId}`);
      } else {
        this.userSocketMap.set(userId, userSockets);
      }
    } catch (e) {
      if (this.configService.get('NODE_ENV') !== 'production') return;
      throw e;
    }
  }

  async onModuleDestroy() {
    this.server.disconnectSockets();
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
