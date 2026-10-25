import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorator';
import { JwtGuard } from 'src/core/guard';
import { IdResponse } from 'src/shared/response/id.response';
import { BoardService } from './board.service';

@ApiTags('boards')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtGuard)
@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @ApiOperation({
    summary: '보드 생성',
    description:
      '입력값 없이 기본 제목과 EDIT 링크 권한으로 생성하고, 로그인한 사용자를 소유자 및 EDIT 권한의 멤버로 등록합니다.',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @Post()
  async create(@CurrentUser() userId: string): Promise<IdResponse> {
    return await this.boardService.create(userId);
  }
}
