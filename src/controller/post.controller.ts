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
  ApiQuery,
} from '@nestjs/swagger';
import { PostService } from 'src/provider/post.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import {
  CreatePostDto,
  PostIdDto,
  NoticePostDto,
  GetPostsQuery,
  GetPostsResponse,
  PostDetailDto,
  TodayPopularDto,
  UpdatePostDto,
} from './dto/post';

@ApiTags('/posts')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 생성' })
  @ApiResponse({
    status: 201,
    description: '게시글 생성 성공',
    type: PostIdDto,
  })
  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<PostIdDto> {
    return await this.postService.create(userId, dto);
  }

  @ApiOperation({ summary: '게시글 조회' })
  @ApiQuery({ name: 'type', enum: ['ALL', 'QUESTION', 'FEEDBACK'] })
  @ApiQuery({ name: 'page', required: false, default: 1 })
  @ApiQuery({ name: 'size', required: false, default: 20 })
  @ApiResponse({
    status: 200,
    description: '게시글 조회 성공',
    type: GetPostsResponse,
  })
  @Get()
  async getPosts(
    @Query() { type, page, size }: GetPostsQuery,
  ): Promise<GetPostsResponse> {
    return await this.postService.getPosts({
      type,
      page: page ?? 0,
      size: size ?? 20,
    });
  }

  @ApiOperation({ summary: '공지사항 조회' })
  @ApiResponse({
    status: 200,
    description: '공지사항 조회 성공',
    type: NoticePostDto,
    isArray: true,
  })
  @Get('notices')
  async getNotices(): Promise<NoticePostDto[]> {
    return await this.postService.getNotices();
  }

  @ApiOperation({ summary: '오늘의 인기글 조회 - 최대 12개' })
  @ApiResponse({
    status: 200,
    description: '오늘의 인기글 조회 성공',
    type: TodayPopularDto,
    isArray: true,
  })
  @Get('today-popular')
  async getTodayPopularPosts(): Promise<TodayPopularDto[]> {
    return await this.postService.getTodayPopularPosts();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 상세 조회 - Optional Guard' })
  @ApiResponse({ status: 200, description: '성공', type: PostDetailDto })
  @ApiResponse({ status: 404, description: '게시글 없음' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getPost(
    @CurrentUser() userId: string | null,
    @Param('id', new ParseUUIDPipe()) postId: string,
  ): Promise<PostDetailDto> {
    return await this.postService.getPost(userId, postId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiResponse({ status: 204, description: '수정 성공' })
  @ApiResponse({ status: 404, description: '게시글 없음' })
  @UseGuards(JwtGuard)
  @Put(':id')
  @HttpCode(204)
  async update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    await this.postService.update(userId, { postId, ...dto });
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 204, description: '삭제 성공' })
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
  @ApiResponse({ status: 204, description: '좋아요 성공' })
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
  @ApiResponse({ status: 204, description: '좋아요 취소 성공' })
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
  @ApiResponse({ status: 204, description: '게시글 저장 성공' })
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
  @ApiResponse({ status: 204, description: '게시글 저장 취소 성공' })
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
