import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorator';
import { JwtGuard } from 'src/core/guard';
import { IdResponse } from 'src/shared/response/id.response';
import { BoardService } from './board.service';
import { BoardSnapshotQuery, JoinBoardRequest } from './dto/board.request';
import { BoardSnapshotResponse, JoinBoardResponse } from './dto/board.response';
import { JoinBoardGuard } from './join-board.guard';

@ApiTags('boards')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @ApiOperation({
    summary: '보드 생성',
    description:
      '입력값 없이 기본 제목과 EDIT 링크 권한으로 생성하고, 로그인한 사용자를 소유자 및 EDIT 권한의 멤버로 등록합니다.',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @UseGuards(JwtGuard)
  @Post()
  async create(@CurrentUser() userId: string): Promise<IdResponse> {
    return await this.boardService.create(userId);
  }

  @ApiOperation({
    summary: '보드 입장',
    description:
      '로그인·비로그인 모두 호출할 수 있습니다. 소유자이거나 개별 초대로 권한을 받았거나 링크 권한이 EDIT이면 입장하고, 소켓 연결용 보드 토큰을 발급합니다. ' +
      '입장한 사람은 모두 보드 참여자로 기록됩니다. 링크로 입장한 사람은 권한 없이 기록되므로, 링크 권한을 NONE으로 바꾸면 더 이상 입장할 수 없습니다. ' +
      '비로그인 사용자는 형용사+동물 이름의 게스트로 입장하며, 이전 보드 토큰을 보내면 같은 게스트로 다시 입장합니다. ' +
      '로그인한 상태로 이전 게스트 토큰을 보내면 그 게스트를 계정에 연결합니다. ' +
      'Authorization 헤더를 보냈는데 유효하지 않으면 게스트로 바꾸지 않고 401을 반환합니다.',
  })
  @ApiResponse({ status: 200, type: JoinBoardResponse })
  @ApiResponse({
    status: 401,
    description:
      '헤더 토큰이 유효하지 않음, 또는 비로그인 사용자가 링크 권한 NONE 보드에 입장',
  })
  @ApiResponse({
    status: 403,
    description: '로그인 사용자가 초대받지 않았는데 링크 권한이 NONE',
  })
  @ApiResponse({ status: 404, description: '보드 없음' })
  @ApiResponse({ status: 409, description: '동시 참여 인원이 가득 참' })
  @HttpCode(200)
  @UseGuards(JoinBoardGuard)
  @Post(':id/join')
  async join(
    @CurrentUser() userId: string | null,
    @Param('id', new ParseUUIDPipe()) boardId: string,
    @Body() { boardToken }: JoinBoardRequest,
  ): Promise<JoinBoardResponse> {
    return await this.boardService.join(boardId, userId, boardToken);
  }

  @ApiOperation({
    summary: '보드 스냅샷',
    description:
      '지금 보이는 획을 seq 순서로 페이지 단위로 돌려줍니다. 입장 API가 발급한 보드 토큰으로 인증합니다. ' +
      '첫 페이지의 lastSeq 이후 변경은 소켓(board:changed, strokes:sync)으로 이어 받습니다.',
  })
  @ApiHeader({ name: 'x-board-token', required: true })
  @ApiResponse({ status: 200, type: BoardSnapshotResponse })
  @ApiResponse({ status: 401, description: '보드 토큰이 없거나 만료됨' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @ApiResponse({ status: 404, description: '보드 없음' })
  @Header('Cache-Control', 'no-store')
  @Get(':id/snapshot')
  async snapshot(
    @Param('id', new ParseUUIDPipe()) boardId: string,
    @Headers('x-board-token') token: string | undefined,
    @Query() { cursor }: BoardSnapshotQuery,
  ): Promise<BoardSnapshotResponse> {
    return await this.boardService.getSnapshot(boardId, token, cursor ?? 0);
  }
}
