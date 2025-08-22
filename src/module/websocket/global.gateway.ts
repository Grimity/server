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
  private subRedis: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.pubRedis = redisService.pubClient;
    this.subRedis = redisService.subClient;
  }

  async handleConnection(client: Socket, ...args: any[]) {
    console.log('커넥션요청 왓음');
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

    await this.pubRedis.set(
      `socket:user:${client.id}`,
      userId,
      'EX',
      60 * 60 * 6,
    ); // TTL 6시간

    await client.join(`user:${userId}`);

    client.emit('connected', {
      socketId: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    // room 정보는 알아서 없어짐
    try {
      await this.pubRedis.del(`socket:user:${client.id}`);
    } catch (e) {
      if (this.configService.get('NODE_ENV') !== 'production') return;
      throw e;
    }
  }

  async onModuleDestroy() {
    this.server.disconnectSockets();
  }

  async getUserIdByClientId(clientId: string) {
    return (await this.pubRedis.get(`socket:user:${clientId}`)) as
      | string
      | null;
  }

  joinChat(socketId: string, chatId: string) {
    this.server.in(socketId).socketsJoin(`chat:${chatId}`);
  }

  leaveChat(socketId: string, chatId: string) {
    this.server.in(socketId).socketsLeave(`chat:${chatId}`);
  }

  async getSocketIdsByUserId(userId: string) {
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();

    return sockets.map((socket) => socket.id);
  }

  async getSocketIdsByChatId(chatId: string) {
    const sockets = await this.server.in(`chat:${chatId}`).fetchSockets();

    return sockets.map((socket) => socket.id);
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
