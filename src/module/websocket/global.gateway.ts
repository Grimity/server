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

@WebSocketGateway({})
export class GlobalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

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
  }

  handleDisconnect(client: any) {
    console.dir(`Client disconnected: ${client.id}`, { depth: null });
  }
}
