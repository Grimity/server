import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/core/guard';
import { AdminPostCommentService } from './admin-post-comment.service';
import { CreateAdminPostCommentRequest } from './dto/admin-post-comment.request';
import { AdminParentPostCommentResponse } from './dto/admin-post-comment.response';

@ApiExcludeController()
@ApiTags('/admin')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: '어드민 인증 실패' })
@Controller('admin/post-comments')
export class AdminPostCommentController {
  constructor(
    private readonly adminPostCommentService: AdminPostCommentService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 게시글 댓글 조회' })
  @ApiResponse({ status: 200, type: [AdminParentPostCommentResponse] })
  @UseGuards(AdminGuard)
  @Get()
  async getComments(
    @Query('postId', new ParseUUIDPipe()) postId: string,
  ): Promise<AdminParentPostCommentResponse[]> {
    return await this.adminPostCommentService.getComments(postId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '어드민 - 공식계정 명의 게시글 댓글 생성 (writerId = OFFICIAL_USER_ID)',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: '게시글 또는 부모 댓글이 없음' })
  @ApiResponse({
    status: 500,
    description: 'OFFICIAL_USER_ID 환경변수 미설정',
  })
  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() dto: CreateAdminPostCommentRequest): Promise<void> {
    await this.adminPostCommentService.create(dto);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 게시글 댓글 삭제(작성자 검증 없음)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '댓글이 없음' })
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @Delete(':id')
  async deleteOne(
    @Param('id', new ParseUUIDPipe()) commentId: string,
  ): Promise<void> {
    await this.adminPostCommentService.deleteOne(commentId);
    return;
  }
}
