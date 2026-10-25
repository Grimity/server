import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardWriter } from './repository/board.writer';

@Module({
  controllers: [BoardController],
  providers: [BoardService, BoardWriter],
})
export class BoardModule {}
