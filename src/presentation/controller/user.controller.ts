import {
  Controller,
  Put,
  UseGuards,
  HttpCode,
  Delete,
  ParseUUIDPipe,
  Param,
  Get,
  Query,
  HttpException,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from 'src/provider/user.service';
import { JwtGuard, OptionalJwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';
import {
  SearchUserRequest,
  GetFeedsByUserRequest,
  CheckNameRequest,
} from '../request/user.request';
import { PageRequest } from '../request/shared';
import {
  SearchedUsersResponse,
  PopularUserResponse,
  UserProfileResponse,
  UserMetaResponse,
} from '../response/user.response';
import { UserFeedsResponse } from '../response/feed.response';
import { MyPostResponse } from '../response/post.response';

@ApiTags('/users')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}
  @ApiOperation({ summary: '닉네임 중복 체크' })
  @ApiResponse({ status: 204, description: '중복 이름 없음' })
  @ApiResponse({ status: 409, description: '중복된 닉네임' })
  @HttpCode(204)
  @Post('name-check')
  async checkName(@Body() { name }: CheckNameRequest) {
    return await this.userService.checkNameOrThrow(name);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '유저 검색' })
  @ApiResponse({ status: 200, type: SearchedUsersResponse })
  @UseGuards(OptionalJwtGuard)
  @Get('search')
  async searchUser(
    @Query() query: SearchUserRequest,
    @CurrentUser() userId: string | null,
  ): Promise<SearchedUsersResponse> {
    return await this.userService.searchUsers({
      keyword: query.keyword,
      cursor: query.cursor ?? null,
      size: query.size ?? 10,
      userId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '인기 유저 조회' })
  @ApiResponse({ status: 200, type: [PopularUserResponse] })
  @UseGuards(OptionalJwtGuard)
  @Get('popular')
  async getPopularUsers(
    @CurrentUser() userId: string | null,
  ): Promise<PopularUserResponse[]> {
    return this.userService.getPopularUsers(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'url로 유저 정보 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: UserProfileResponse })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(OptionalJwtGuard)
  @Get('/profile/:url')
  async getProfileByUrl(
    @CurrentUser() userId: string | null,
    @Param('url') url: string,
  ): Promise<UserProfileResponse> {
    return this.userService.getUserProfileByUrl(userId, url);
  }

  @ApiOperation({ summary: 'url로 유저 메타데이터 조회' })
  @ApiResponse({ status: 200, type: UserMetaResponse })
  @Get('/profile/:url/meta')
  async getMetaByUrl(@Param('url') url: string): Promise<UserMetaResponse> {
    return this.userService.getMetaByUrl(url);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '유저 정보 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: UserProfileResponse })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getUserById(
    @CurrentUser() userId: string | null,
    @Param('id', ParseUUIDPipe) targetId: string,
  ): Promise<UserProfileResponse> {
    return this.userService.getUserProfileById(userId, targetId);
  }

  @ApiOperation({ summary: '유저 메타데이터 조회' })
  @ApiResponse({ status: 200, type: UserMetaResponse })
  @Get(':id/meta')
  async getMeta(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserMetaResponse> {
    return this.userService.getMetaById(id);
  }

  @ApiOperation({ summary: '유저별 피드 조회' })
  @ApiResponse({ status: 200, type: UserFeedsResponse })
  @UseGuards(OptionalJwtGuard)
  @Get(':id/feeds')
  async getFeeds(
    @Param('id', ParseUUIDPipe) targetId: string,
    @Query() query: GetFeedsByUserRequest,
  ): Promise<UserFeedsResponse> {
    const { sort, cursor, size, albumId } = query;
    return this.userService.getFeedsByUser({
      sort: sort ?? 'latest',
      cursor: cursor ?? null,
      size: size ?? 20,
      targetId,
      albumId: albumId ?? null,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '유저별 게시글 조회 - 일관성을 위해서 경로는 이렇게하지만 accT는 있어야합니다',
  })
  @ApiResponse({ status: 200, type: [MyPostResponse] })
  @UseGuards(JwtGuard)
  @Get(':id/posts')
  async getPosts(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Query() { page, size }: PageRequest,
  ): Promise<MyPostResponse[]> {
    if (userId !== targetId) {
      throw new HttpException('Forbidden', 403);
    }
    return this.userService.getMyPosts({
      userId,
      page: page ?? 1,
      size: size ?? 10,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '팔로우' })
  @ApiResponse({ status: 204 })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put(':id/follow')
  async follow(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    await this.userService.follow(userId, targetId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '언팔로우' })
  @ApiResponse({ status: 204 })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete(':id/follow')
  async unfollow(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    await this.userService.unfollow(userId, targetId);
    return;
  }
}
