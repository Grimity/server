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

@WebSocketGateway({})
export class GlobalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private pubRedis: Redis;
  private subRedis: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
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

    await this.pubRedis.incr(`connectionCount:${client.data.user.id}`);
    await this.pubRedis.expire(
      `connectionCount:${client.data.user.id}`,
      60 * 60 * 24,
    );

    await client.join(`user:${client.data.user.id}`);

    client.emit('connected', {
      socketId: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    if (client.data?.user) {
      try {
        await this.pubRedis.decr(`connectionCount:${client.data.user.id}`);

        await client.leave(`user:${client.data.user.id}`);
      } catch (e) {
        return;
      }
    }
  }
}
