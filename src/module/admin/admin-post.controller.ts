import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import { AdminPostService } from './admin-post.service';
import { AdminGetPostsRequest } from './dto/admin-post.request';
import {
  AdminLatestPostsResponse,
  AdminPostDetailResponse,
} from './dto/admin-post.response';

@ApiExcludeController()
@ApiTags('/admin')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: '어드민 인증 실패' })
@Controller('admin/posts')
export class AdminPostController {
  constructor(private readonly adminPostService: AdminPostService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 게시글 목록 최신순 조회' })
  @ApiResponse({ status: 200, type: AdminLatestPostsResponse })
  @UseGuards(AdminGuard)
  @Get()
  async getPosts(
    @Query() query: AdminGetPostsRequest,
  ): Promise<AdminLatestPostsResponse> {
    return await this.adminPostService.getLatestPosts({
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
      type: query.type ?? 'ALL',
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 게시글 상세 조회' })
  @ApiResponse({ status: 200, type: AdminPostDetailResponse })
  @ApiResponse({ status: 404, description: '게시글이 없음' })
  @UseGuards(AdminGuard)
  @Get(':id')
  async getPost(
    @Param('id', new ParseUUIDPipe()) postId: string,
  ): Promise<AdminPostDetailResponse> {
    return await this.adminPostService.getPost(postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 게시글 삭제(작성자 검증 없음)' })
  @ApiResponse({ status: 204, description: '게시글 삭제 성공' })
  @ApiResponse({ status: 404, description: '게시글이 없음' })
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @Delete(':id')
  async deletePost(@Param('id', new ParseUUIDPipe()) postId: string) {
    await this.adminPostService.deleteOne(postId);
    return;
  }
}
