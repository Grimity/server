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
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PostService } from 'src/provider/post.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import {
  CreatePostDto,
  PostIdDto,
  NoticePostDto,
  GetPostsQuery,
  GetPostsResponse,
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

  @Get('notices')
  @ApiOperation({ summary: '공지사항 조회' })
  @ApiResponse({
    status: 200,
    description: '공지사항 조회 성공',
    type: NoticePostDto,
    isArray: true,
  })
  async getNotices(): Promise<NoticePostDto[]> {
    return await this.postService.getNotices();
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
}
