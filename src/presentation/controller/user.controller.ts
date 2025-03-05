import {
  Controller,
  Put,
  UseGuards,
  Body,
  HttpCode,
  Delete,
  ParseUUIDPipe,
  Param,
  Get,
  Query,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from 'src/provider/user.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import {
  UserFeedsResponse,
  MyLikeFeedsResponse,
  MyPostDto,
  GetMySavePostsResponse,
  UserMetaDto,
} from 'src/controller/dto/user';

import {
  UpdateUserRequest,
  UpdateProfileImageRequest,
  UpdateBackgroundImageRequest,
  UpdateSubscriptionRequest,
  SearchUserRequest,
  GetFeedsByUserRequest,
} from '../request/user.request';
import { CursorRequest, PageRequest } from '../request/shared';

import {
  MyProfileResponse,
  SubscriptionResponse,
  MyFollowersResponse,
  MyFollowingsResponse,
  SearchedUsersResponse,
  PopularUserResponse,
  UserProfileResponse,
} from '../response/user.response';

@ApiTags('/users')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, description: '성공', type: MyProfileResponse })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(JwtGuard)
  @Get('me')
  async getMe(@CurrentUser() userId: string): Promise<MyProfileResponse> {
    return this.userService.getMyProfile(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 변경' })
  @ApiResponse({ status: 204, description: '성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이름' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put('me')
  async updateProfile(
    @CurrentUser() userId: string,
    @Body() dto: UpdateUserRequest,
  ) {
    await this.userService.updateProfile(userId, dto);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 204, description: '성공' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete('me')
  async deleteUser(@CurrentUser() userId: string) {
    await this.userService.deleteMe(userId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 이미지 변경' })
  @ApiResponse({ status: 204, description: '성공' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put('me/image')
  async updateProfileImage(
    @CurrentUser() userId: string,
    @Body() { imageName }: UpdateProfileImageRequest,
  ) {
    await this.userService.updateProfileImage(userId, imageName);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 이미지 삭제' })
  @ApiResponse({ status: 204, description: '성공' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete('me/image')
  async deleteProfileImage(@CurrentUser() userId: string) {
    await this.userService.updateProfileImage(userId, null);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '배경사진 변경' })
  @ApiResponse({ status: 204, description: '성공' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put('me/background')
  async updateBackgroundImage(
    @CurrentUser() userId: string,
    @Body() { imageName }: UpdateBackgroundImageRequest,
  ) {
    await this.userService.updateBackgroundImage(userId, imageName);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '배경사진 삭제' })
  @ApiResponse({ status: 204, description: '성공' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete('me/background')
  async deleteBackgroundImage(@CurrentUser() userId: string) {
    await this.userService.updateBackgroundImage(userId, null);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '알림 구독 여부 조회' })
  @ApiResponse({ status: 200, description: '성공', type: SubscriptionResponse })
  @UseGuards(JwtGuard)
  @Get('me/subscribe')
  async getSubscriptions(
    @CurrentUser() userId: string,
  ): Promise<SubscriptionResponse> {
    return await this.userService.getSubscription(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '알림 구독 여부 수정' })
  @ApiResponse({ status: 204, description: '성공' })
  @UseGuards(JwtGuard)
  @Put('me/subscribe')
  @HttpCode(204)
  async updateSubscriptions(
    @CurrentUser() userId: string,
    @Body() { subscription }: UpdateSubscriptionRequest,
  ) {
    await this.userService.updateSubscription(userId, [
      ...new Set(subscription),
    ]);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 팔로워 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyFollowersResponse,
  })
  @UseGuards(JwtGuard)
  @Get('me/followers')
  async getMyFollowers(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyFollowersResponse> {
    return this.userService.getMyFollowers(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 팔로잉 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyFollowingsResponse,
  })
  @UseGuards(JwtGuard)
  @Get('me/followings')
  async getMyFollowings(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyFollowingsResponse> {
    return this.userService.getMyFollowings(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 팔로워 삭제' })
  @ApiResponse({ status: 204, description: '성공' })
  @ApiResponse({ status: 404, description: '팔로우하지 않은 유저' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete('me/followers/:id')
  async deleteMyFollower(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    await this.userService.unfollow(targetId, userId);
    return;
  }

  // TODO response 리팩터링
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 좋아요한 피드 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyLikeFeedsResponse,
  })
  @UseGuards(JwtGuard)
  @Get('me/like-feeds')
  async getMyLikeFeeds(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyLikeFeedsResponse> {
    return await this.userService.getMyLikeFeeds(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  // TODO response 리팩터링
  @ApiBearerAuth()
  @ApiOperation({ summary: '내가 저장한 피드 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyLikeFeedsResponse,
  })
  @UseGuards(JwtGuard)
  @Get('me/save-feeds')
  async getMySaveFeeds(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyLikeFeedsResponse> {
    return await this.userService.getMySaveFeeds(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  // TODO response 리팩터링
  @ApiBearerAuth()
  @ApiOperation({ summary: '내가 저장한 게시글 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: GetMySavePostsResponse,
  })
  @UseGuards(JwtGuard)
  @Get('me/save-posts')
  async getMySavePosts(
    @CurrentUser() userId: string,
    @Query() { page, size }: PageRequest,
  ): Promise<GetMySavePostsResponse> {
    return await this.userService.getMySavePosts({
      userId,
      page: page ?? 1,
      size: size ?? 10,
    });
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
      sort: query.sort ?? 'popular',
      userId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '인기 유저 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: [PopularUserResponse],
  })
  @UseGuards(OptionalJwtGuard)
  @Get('popular')
  async getPopularUsers(
    @CurrentUser() userId: string | null,
  ): Promise<PopularUserResponse[]> {
    return this.userService.getPopularUsers(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '유저 정보 조회 - Optional Guard' })
  @ApiResponse({ status: 200, description: '성공', type: UserProfileResponse })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getUser(
    @CurrentUser() userId: string | null,
    @Param('id', ParseUUIDPipe) targetId: string,
  ): Promise<UserProfileResponse> {
    return this.userService.getUserProfile(userId, targetId);
  }

  @ApiOperation({ summary: '유저 메타데이터 조회' })
  @ApiResponse({ status: 200, description: '성공', type: UserMetaDto })
  @Get(':id/meta')
  async getMeta(@Param('id', ParseUUIDPipe) id: string): Promise<UserMetaDto> {
    return this.userService.getMeta(id);
  }

  @ApiOperation({ summary: '유저별 피드 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: UserFeedsResponse,
  })
  @UseGuards(OptionalJwtGuard)
  @Get(':id/feeds')
  async getFeeds(
    @Param('id', ParseUUIDPipe) targetId: string,
    @Query() query: GetFeedsByUserRequest,
  ): Promise<UserFeedsResponse> {
    const { sort, cursor, size } = query;
    return this.userService.getFeedsByUser({
      sort: sort ?? 'latest',
      cursor: cursor ?? null,
      size: size ?? 20,
      targetId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '유저별 게시글 조회 - 일관성을 위해서 경로는 이렇게하지만 accT는 있어야합니다',
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyPostDto,
    isArray: true,
  })
  @UseGuards(JwtGuard)
  @Get(':id/posts')
  async getPosts(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Query() { page, size }: PageRequest,
  ): Promise<MyPostDto[]> {
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
  @ApiResponse({ status: 204, description: '성공' })
  @ApiResponse({ status: 409, description: '이미 팔로우 했음' })
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
  @ApiResponse({ status: 204, description: '성공' })
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
