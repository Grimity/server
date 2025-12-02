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
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { CursorRequest } from 'src/shared/request/cursor.request';
import {
  CreateFeedRequest,
  SearchFeedRequest,
  UpdateFeedRequest,
  DeleteFeedsRequest,
  GetRankingsRequest,
} from './dto/feed.api.request';
import { IdResponse } from 'src/shared/response/id.response';
import {
  SearchedFeedsResponse,
  LatestFeedsResponse,
  FollowingFeedsResponse,
  FeedDetailResponse,
  FeedMetaResponse,
  FeedRankingsResponse,
} from './dto/feed.api.response';
import { FeedLikedUserResponse } from '../user/dto/user.api.response';

import { JwtGuard, OptionalJwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';

@ApiTags('/feeds')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('feeds')
export class FeedController {
  constructor(private feedService: FeedService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 생성' })
  @ApiResponse({ status: 201, type: IdResponse })
  @UseGuards(JwtGuard)
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateFeedRequest,
  ): Promise<IdResponse> {
    return await this.feedService.create(userId, {
      ...dto,
      albumId: dto.albumId ?? null,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 여러개 삭제' })
  @ApiResponse({ status: 204 })
  @UseGuards(JwtGuard)
  @Post('batch-delete')
  async deleteMany(
    @CurrentUser() userId: string,
    @Body() { ids }: DeleteFeedsRequest,
  ) {
    await this.feedService.deleteMany(userId, ids);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 검색 - Optional Guard' })
  @ApiResponse({ status: 200, type: SearchedFeedsResponse })
  @UseGuards(OptionalJwtGuard)
  @Get('search')
  async search(
    @CurrentUser() userId: string | null,
    @Query() { keyword, cursor, size, sort }: SearchFeedRequest,
  ): Promise<SearchedFeedsResponse> {
    return await this.feedService.search({
      userId,
      keyword,
      cursor: cursor ?? null,
      size: size ?? 20,
      sort: sort ?? 'latest',
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '랭킹 조회 - Optional Guard' })
  @ApiResponse({ type: FeedRankingsResponse })
  @UseGuards(OptionalJwtGuard)
  @Get('rankings')
  async getFeedRanks(
    @CurrentUser() userId: string | null,
    @Query() { month, startDate, endDate }: GetRankingsRequest,
  ): Promise<FeedRankingsResponse> {
    if (month) {
      return await this.feedService.getRankingsByMonth(userId, month);
    } else if (startDate && endDate) {
      return await this.feedService.getRankingsByDateRange({
        userId,
        startDate,
        endDate,
      });
    }

    throw new HttpException(
      'month나 startDate,endDate 중 하나는 있어야 합니다',
      400,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: '최신순 그림 목록 조회, 무한스크롤 - Optional Guard',
  })
  @ApiResponse({ status: 200, type: LatestFeedsResponse })
  @UseGuards(OptionalJwtGuard)
  @Get('latest')
  async getFeeds(
    @CurrentUser() userId: string | null,
    @Query() { cursor, size }: CursorRequest,
  ): Promise<LatestFeedsResponse> {
    return await this.feedService.getLatestFeeds(userId, {
      cursor: cursor ?? null,
      size: size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '팔로잉한 유저들의 피드 목록 조회' })
  @ApiResponse({ status: 200, type: FollowingFeedsResponse })
  @UseGuards(JwtGuard)
  @Get('following')
  async getFollowingFeeds(
    @CurrentUser() userId: string,
    @Query() { size, cursor }: CursorRequest,
  ): Promise<FollowingFeedsResponse> {
    return await this.feedService.getFollowingFeeds(userId, {
      size: size ?? 10,
      cursor: cursor ?? null,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 상세 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: FeedDetailResponse })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getFeed(
    @CurrentUser() userId: string | null,
    @Param('id', ParseUUIDPipe) feedId: string,
  ): Promise<FeedDetailResponse> {
    return await this.feedService.getFeed(userId, feedId);
  }

  @ApiOperation({ summary: '피드 메타데이터 조회' })
  @ApiResponse({ status: 200, type: FeedMetaResponse })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @Get(':id/meta')
  async getFeedMeta(
    @Param('id', ParseUUIDPipe) feedId: string,
  ): Promise<FeedMetaResponse> {
    return await this.feedService.getMeta(feedId);
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
    @Body() dto: UpdateFeedRequest,
  ) {
    await this.feedService.update(userId, {
      feedId,
      ...dto,
      albumId: dto.albumId ?? null,
    });
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
  @ApiOperation({ summary: '좋아요 누른 유저 목록 조회', deprecated: true })
  @ApiResponse({ status: 200, type: [FeedLikedUserResponse] })
  @UseGuards(JwtGuard)
  @Get(':id/like')
  async getLikeUsers(
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ): Promise<FeedLikedUserResponse[]> {
    return await this.feedService.getLikes(feedId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'like' })
  @ApiResponse({ status: 204, description: '좋아요 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
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
  @ApiOperation({ summary: 'save' })
  @ApiResponse({ status: 204, description: '저장 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put(':id/save')
  async save(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.save(userId, feedId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'unsave' })
  @ApiResponse({ status: 204, description: '저장 취소 성공' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete(':id/save')
  async unsave(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.unsave(userId, feedId);
    return;
  }

  @ApiOperation({ summary: '피드 조회수 증가용 api' })
  @ApiResponse({ status: 204, description: '조회 성공' })
  @HttpCode(204)
  @Put(':id/view')
  async view(@Param('id', new ParseUUIDPipe()) feedId: string) {
    await this.feedService.view(feedId);
    return;
  }
}
