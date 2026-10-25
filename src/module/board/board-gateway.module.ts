import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { BoardModule } from './board.module';

// 보드 API 테스트가 Redis 없이 돌도록 게이트웨이는 모듈을 나눈다.
@Module({
  imports: [BoardModule],
  providers: [BoardGateway],
})
export class BoardGatewayModule {}
