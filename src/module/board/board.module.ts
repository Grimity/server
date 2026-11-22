import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardRealtimeService } from './board-realtime.service';
import { BoardStrokeService } from './board-stroke.service';
import { BoardTokenService } from './board-token.service';
import { BoardStrokeRepository } from './repository/board-stroke.repository';
import { BoardReader } from './repository/board.reader';
import { BoardWriter } from './repository/board.writer';

@Module({
  controllers: [BoardController],
  providers: [
    BoardService,
    BoardStrokeService,
    BoardRealtimeService,
    BoardTokenService,
    BoardReader,
    BoardWriter,
    BoardStrokeRepository,
  ],
  exports: [
    BoardService,
    BoardStrokeService,
    BoardRealtimeService,
    BoardTokenService,
  ],
})
export class BoardModule {}
