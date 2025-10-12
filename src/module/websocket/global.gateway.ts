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
import { OnModuleDestroy, Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class GlobalGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GlobalGateway.name);
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
    try {
      // jwt
      const token = client.handshake.auth?.accessToken;

      if (!token) {
        this.logger.warn(`No token provided for client: ${client.id}`);
        client.emit('error', {
          statusCode: 401,
          message: 'No token provided',
        });
        client.disconnect();
        return;
      }

      try {
        const payload = await this.jwtService.verifyAsync(token, {
          ignoreExpiration: true,
        });
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
    } catch (error) {
      this.logger.error(
        `Error in handleConnection for client ${client.id}:`,
        error,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    // room 정보는 알아서 없어짐
    try {
      // client.data.user가 없는 경우(인증 실패한 클라이언트) 안전하게 처리
      if (!client.data?.user?.id) {
        this.logger.warn(`Client ${client.id} disconnecting without user data`);
        return;
      }

      const userId = client.data.user.id as string;

      const userSockets = this.userSocketMap.get(userId);
      if (!userSockets) {
        return;
      }

      await this.pubRedis.del(`user:${userId}:online:chats`);

      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.userSocketMap.delete(userId);
        await this.redisService.unSubscribe(`user:${userId}`);
      } else {
        this.userSocketMap.set(userId, userSockets);
      }
    } catch (e) {
      // 로깅을 위해 에러를 출력하지만 서버가 다운되지 않도록 함
      this.logger.error(
        `Error in handleDisconnect for client ${client.id}:`,
        e,
      );
      // production 환경에서도 에러를 던지지 않도록 수정
      return;
    }
  }

  async onModuleDestroy() {
    this.server.disconnectSockets();
  }

  emitMessageEventToUser(userId: string, dto: NewChatMessageEventResponse) {
    this.server.to(`user:${userId}`).emit('newChatMessage', dto);
  }

  emitDeleteChatEventToUser(userId: string, chatIds: string[]) {
    this.server.to(`user:${userId}`).emit('deleteChat', chatIds);
  }

  emitLikeChatMessageEventToUser(userId: string, chatMessageId: string) {
    this.server.to(`user:${userId}`).emit('likeChatMessage', chatMessageId);
  }

  emitUnlikeChatMessageEventToUser(userId: string, chatMessageId: string) {
    this.server.to(`user:${userId}`).emit('unlikeChatMessage', chatMessageId);
  }

  emitNewNotificationToUser(userId: string, dto: NotificationResponse) {
    this.server.to(`user:${userId}`).emit('newNotification', dto);
  }
}
