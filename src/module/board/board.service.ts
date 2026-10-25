import { Injectable } from '@nestjs/common';
import { IdResponse } from 'src/shared/response/id.response';
import { BoardWriter } from './repository/board.writer';

@Injectable()
export class BoardService {
  constructor(private readonly boardWriter: BoardWriter) {}

  async create(userId: string): Promise<IdResponse> {
    return await this.boardWriter.create(userId);
  }
}
