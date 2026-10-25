import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardTokenService } from './board-token.service';
import { BoardReader } from './repository/board.reader';
import { BoardWriter } from './repository/board.writer';

@Module({
  controllers: [BoardController],
  providers: [BoardService, BoardTokenService, BoardReader, BoardWriter],
  exports: [BoardService, BoardTokenService],
})
export class BoardModule {}
