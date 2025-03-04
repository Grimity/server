import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  ParseUUIDPipe,
  Put,
  Param,
  HttpCode,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { PostCommentService } from 'src/provider/post-comment.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import {
  CreatePostCommentDto,
  PostParentCommentDto,
  CreatedCommentDto,
} from 'src/controller/dto/post-comment';

@ApiTags('/post-comments')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('post-comments')
export class PostCommentController {
  constructor(private postCommentService: PostCommentService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 생성' })
  @ApiResponse({ status: 201, description: '성공', type: CreatedCommentDto })
  @Post()
  @UseGuards(JwtGuard)
  async createPostComment(
    @CurrentUser() userId: string,
    @Body() createPostCommentDto: CreatePostCommentDto,
  ): Promise<CreatedCommentDto> {
    return await this.postCommentService.create({
      ...createPostCommentDto,
      userId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 조회 - Optional Guard' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: PostParentCommentDto,
    isArray: true,
  })
  @Get()
  @UseGuards(OptionalJwtGuard)
  async getPostComments(
    @CurrentUser() userId: string | null,
    @Query('postId', ParseUUIDPipe) postId: string,
  ): Promise<PostParentCommentDto[]> {
    return await this.postCommentService.getComments(userId, postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 삭제' })
  @ApiResponse({ status: 204, description: '성공' })
  @ApiResponse({ status: 404, description: '없는 댓글' })
  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(204)
  async deletePostComment(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.postCommentService.deleteOne(userId, id);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 좋아요' })
  @ApiResponse({ status: 204, description: '성공' })
  @ApiResponse({ status: 404, description: '없는 댓글' })
  @ApiResponse({ status: 409, description: '이미 좋아요한 댓글' })
  @UseGuards(JwtGuard)
  @Put(':id/like')
  @HttpCode(204)
  async likePostComment(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.postCommentService.like(userId, id);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 좋아요 취소' })
  @ApiResponse({ status: 204, description: '성공' })
  @ApiResponse({
    status: 404,
    description: '없는 댓글이거나 좋아요한적이 없을때',
  })
  @UseGuards(JwtGuard)
  @Delete(':id/like')
  @HttpCode(204)
  async unlikePostComment(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.postCommentService.unlike(userId, id);
    return;
  }
}
