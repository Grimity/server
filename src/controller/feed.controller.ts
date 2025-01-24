import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  ParseUUIDPipe,
  HttpCode,
  Delete,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FeedService } from 'src/provider/feed.service';
import {
  CreateFeedDto,
  FeedIdDto,
  FeedDetailDto,
  UpdateFeedDto,
  GetLatestFeedsQuery,
  GetLastestFeedsResponse,
  GetTodayPopularQuery,
  TodayPopularFeedResponse,
  GetFollowingFeedsQuery,
} from './dto/feed';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

@ApiTags('/feeds')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('feeds')
export class FeedController {
  constructor(private feedService: FeedService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 생성' })
  @ApiResponse({
    status: 201,
    description: '피드 생성 성공',
    type: FeedIdDto,
  })
  @UseGuards(JwtGuard)
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() createFeedDto: CreateFeedDto,
  ): Promise<FeedIdDto> {
    return await this.feedService.create(userId, createFeedDto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: '최신순 그림 목록 조회, 무한스크롤 - Optional Guard',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: 'string',
    description: '없으면 처음부터',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: 'number',
    default: 20,
  })
  @ApiResponse({
    status: 200,
    description: '피드 목록 조회 성공',
    type: GetLastestFeedsResponse,
    isArray: true,
  })
  @UseGuards(OptionalJwtGuard)
  @Get('latest')
  async getFeeds(
    @CurrentUser() userId: string | null,
    @Query() { cursor, size }: GetLatestFeedsQuery,
  ): Promise<GetLastestFeedsResponse> {
    return await this.feedService.getFeeds(userId, {
      cursor: cursor ?? null,
      size: size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '오늘의 인기 랭킹 조회 - Optional Guard' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: 'number',
    default: 9,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: 'string',
    description: '없으면 처음부터',
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: TodayPopularFeedResponse,
    isArray: true,
  })
  @UseGuards(OptionalJwtGuard)
  @Get('today-popular')
  async getHotFeeds(
    @CurrentUser() userId: string | null,
    @Query() { size, cursor }: GetTodayPopularQuery,
  ): Promise<TodayPopularFeedResponse> {
    return await this.feedService.getTodayPopular({
      userId,
      size: size ?? 9,
      cursor: cursor ?? null,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '팔로잉한 유저들의 피드 목록 조회' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: 'number',
    default: 10,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: 'string',
    description: '없으면 처음부터',
  })
  @UseGuards(JwtGuard)
  @Get('following')
  async getFollowingFeeds(
    @CurrentUser() userId: string,
    @Query() { size, cursor }: GetFollowingFeedsQuery,
  ) {
    return await this.feedService.getFollowingFeeds(userId, {
      size: size ?? 10,
      cursor: cursor ?? null,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 상세 조회 - Optional Guard' })
  @ApiResponse({
    status: 200,
    description: '피드 조회 성공',
    type: FeedDetailDto,
  })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getFeed(
    @CurrentUser() userId: string | null,
    @Param('id', ParseUUIDPipe) feedId: string,
  ): Promise<FeedDetailDto> {
    return await this.feedService.getFeed(userId, feedId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 수정' })
  @ApiResponse({ status: 204, description: '피드 수정 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put(':id')
  async update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) feedId: string,
    @Body() updateFeedDto: UpdateFeedDto,
  ) {
    await this.feedService.update(userId, { feedId, ...updateFeedDto });
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 삭제' })
  @ApiResponse({ status: 204, description: '피드 삭제 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete(':id')
  async delete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.deleteOne(userId, feedId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'like' })
  @ApiResponse({ status: 204, description: '좋아요 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @ApiResponse({ status: 409, description: '이미 좋아요를 누름' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put(':id/like')
  async like(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.like(userId, feedId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'unlike' })
  @ApiResponse({ status: 204, description: '좋아요 취소 성공' })
  @ApiResponse({ status: 404, description: '좋아요를 안했음' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete(':id/like')
  async unlike(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.unlike(userId, feedId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 조회수 증가용 api - Optional Guard' })
  @ApiResponse({ status: 204, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(OptionalJwtGuard)
  @HttpCode(204)
  @Put(':id/view')
  async view(
    @CurrentUser() userId: string | null,
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.view(userId, feedId);
    return;
  }
}
