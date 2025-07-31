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
import { WsException } from '@nestjs/websockets';
import Redis from 'ioredis';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({})
export class GlobalGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
}
