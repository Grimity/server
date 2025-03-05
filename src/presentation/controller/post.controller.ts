import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Query,
  Put,
  Param,
  ParseUUIDPipe,
  HttpCode,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostService } from 'src/provider/post.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

import {
  CreatePostRequest,
  GetPostsRequest,
  SearchPostRequest,
} from '../request/post.request';
import { IdResponse } from '../response/shared';
import {
  PostBaseResponse,
  PostResponse,
  PostsResponse,
  PostDetailResponse,
} from '../response/post.response';

@ApiTags('/posts')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 생성' })
  @ApiResponse({ status: 201, type: IdResponse })
  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreatePostRequest,
  ): Promise<IdResponse> {
    return await this.postService.create(userId, dto);
  }

  @ApiOperation({ summary: '게시글 조회' })
  @ApiResponse({ status: 200, type: PostsResponse })
  @Get()
  async getPosts(
    @Query() { type, page, size }: GetPostsRequest,
  ): Promise<PostsResponse> {
    return await this.postService.getPosts({
      type,
      page: page ?? 1,
      size: size ?? 20,
    });
  }

  @ApiOperation({ summary: '공지사항 조회' })
  @ApiResponse({ status: 200, type: [PostResponse] })
  @Get('notices')
  async getNotices(): Promise<PostResponse[]> {
    return await this.postService.getNotices();
  }

  @ApiOperation({ summary: '게시글 검색' })
  @ApiResponse({ status: 200, type: PostsResponse })
  @Get('search')
  async searchPosts(
    @Query() { keyword, page, size, searchBy }: SearchPostRequest,
  ): Promise<PostsResponse> {
    if (searchBy === 'name') {
      return await this.postService.searchByAuthorName({
        keyword,
        page: page ?? 1,
        size: size ?? 10,
      });
    } else {
      return await this.postService.searchByTitleAndContent({
        keyword,
        page: page ?? 1,
        size: size ?? 10,
      });
    }
  }

  @ApiOperation({ summary: '오늘의 인기글 조회 - 최대 12개' })
  @ApiResponse({ status: 200, type: [PostResponse] })
  @Get('today-popular')
  async getTodayPopularPosts(): Promise<PostResponse[]> {
    return await this.postService.getTodayPopularPosts();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 상세 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: PostDetailResponse })
  @ApiResponse({ status: 404, description: '게시글 없음' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getPost(
    @CurrentUser() userId: string | null,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ): Promise<PostDetailResponse> {
    return await this.postService.getPost(userId, postId);
  }

  @ApiOperation({ summary: '게시글 메타데이터 조회' })
  @ApiResponse({ status: 200, type: PostBaseResponse })
  @ApiResponse({ status: 404, description: '게시글 없음' })
  @Get(':id/meta')
  async getMeta(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PostBaseResponse> {
    return await this.postService.getMeta(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '게시글 없음' })
  @UseGuards(JwtGuard)
  @Put(':id')
  @HttpCode(204)
  async update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body() dto: CreatePostRequest,
  ) {
    await this.postService.update(userId, { postId, ...dto });
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '게시글 없음' })
  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    await this.postService.deleteOne(userId, postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 좋아요' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '좋아요할 게시글 없음' })
  @ApiResponse({ status: 409, description: '이미 좋아요한 게시글' })
  @UseGuards(JwtGuard)
  @Put(':id/like')
  @HttpCode(204)
  async like(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    await this.postService.like(userId, postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 좋아요 취소' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '좋아요 한 적이 없음' })
  @UseGuards(JwtGuard)
  @Delete(':id/like')
  @HttpCode(204)
  async unlike(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    await this.postService.unlike(userId, postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 저장' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '저장할 게시글 없음' })
  @ApiResponse({ status: 409, description: '이미 저장한 게시글' })
  @UseGuards(JwtGuard)
  @Put(':id/save')
  @HttpCode(204)
  async save(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    await this.postService.save(userId, postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 저장 취소' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '저장한 적이 없음' })
  @UseGuards(JwtGuard)
  @Delete(':id/save')
  @HttpCode(204)
  async unsave(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ) {
    await this.postService.unsave(userId, postId);
  }
}
