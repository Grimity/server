import {
  Controller,
  UseGuards,
  Get,
  HttpCode,
  Put,
  Body,
  Delete,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CurrentUser } from 'src/core/decorator';
import { JwtGuard } from 'src/core/guard';
import { CursorRequest } from 'src/shared/request/cursor.request';
import { PageRequest } from 'src/shared/request/page.request';
import {
  UpdateUserRequest,
  UpdateProfileImageRequest,
  UpdateBackgroundImageRequest,
  UpdateSubscriptionRequest,
  GetFollowingRequest,
} from './dto/user.request';
import { AlbumBaseResponse } from '../album/dto/album.response';
import {
  MyProfileResponse,
  UpdateProfileConflictResponse,
  SubscriptionResponse,
  MyFollowersResponse,
  MyFollowingsResponse,
} from './dto/user.response';
import { MyLikeFeedsResponse } from '../feed/dto/feed.response';
import { MySavePostsResponse } from '../post/dto/post.response';

@ApiTags('/me')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@UseGuards(JwtGuard)
@Controller('me')
export class MeController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, type: MyProfileResponse })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @Get()
  async getMe(@CurrentUser() userId: string): Promise<MyProfileResponse> {
    return this.userService.getMyProfile(userId);
  }

  @ApiOperation({ summary: '내 정보 변경' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: UpdateProfileConflictResponse })
  @HttpCode(204)
  @Put()
  async updateProfile(
    @CurrentUser() userId: string,
    @Body() dto: UpdateUserRequest,
  ) {
    await this.userService.updateProfile(userId, dto);
    return;
  }

  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete()
  async deleteUser(@CurrentUser() userId: string) {
    await this.userService.deleteMe(userId);
    return;
  }

  @ApiOperation({ summary: '프로필 이미지 변경' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Put('image')
  async updateProfileImage(
    @CurrentUser() userId: string,
    @Body() { imageName }: UpdateProfileImageRequest,
  ) {
    await this.userService.updateProfileImage(userId, imageName);
    return;
  }

  @ApiOperation({ summary: '프로필 이미지 삭제' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete('image')
  async deleteProfileImage(@CurrentUser() userId: string) {
    await this.userService.updateProfileImage(userId, null);
    return;
  }

  @ApiOperation({ summary: '배경사진 변경' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Put('background')
  async updateBackgroundImage(
    @CurrentUser() userId: string,
    @Body() { imageName }: UpdateBackgroundImageRequest,
  ) {
    await this.userService.updateBackgroundImage(userId, imageName);
    return;
  }

  @ApiOperation({ summary: '배경사진 삭제' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete('background')
  async deleteBackgroundImage(@CurrentUser() userId: string) {
    await this.userService.updateBackgroundImage(userId, null);
    return;
  }

  @ApiOperation({ summary: '알림 구독 여부 조회' })
  @ApiResponse({ status: 200, type: SubscriptionResponse })
  @Get('subscribe')
  async getSubscriptions(
    @CurrentUser() userId: string,
  ): Promise<SubscriptionResponse> {
    return await this.userService.getSubscription(userId);
  }

  @ApiOperation({ summary: '알림 구독 여부 수정' })
  @ApiResponse({ status: 204 })
  @Put('subscribe')
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

  @ApiOperation({ summary: '내 팔로워 조회' })
  @ApiResponse({ status: 200, type: MyFollowersResponse })
  @Get('followers')
  async getMyFollowers(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyFollowersResponse> {
    return this.userService.getMyFollowers(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiOperation({ summary: '내 팔로잉 조회' })
  @ApiResponse({ status: 200, type: MyFollowingsResponse })
  @Get('followings')
  async getMyFollowings(
    @CurrentUser() userId: string,
    @Query() query: GetFollowingRequest,
  ): Promise<MyFollowingsResponse> {
    return this.userService.getMyFollowings(userId, {
      keyword: query.keyword ?? null,
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiOperation({ summary: '내 팔로워 삭제' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '팔로우하지 않은 유저' })
  @HttpCode(204)
  @Delete('followers/:id')
  async deleteMyFollower(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    await this.userService.unfollowTransaction(targetId, userId);
    return;
  }

  @ApiOperation({ summary: '내 좋아요한 피드 조회' })
  @ApiResponse({ status: 200, type: MyLikeFeedsResponse })
  @Get('like-feeds')
  async getMyLikeFeeds(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyLikeFeedsResponse> {
    return await this.userService.getMyLikeFeeds(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiOperation({ summary: '내가 저장한 피드 조회' })
  @ApiResponse({ status: 200, type: MyLikeFeedsResponse })
  @Get('save-feeds')
  async getMySaveFeeds(
    @CurrentUser() userId: string,
    @Query() query: CursorRequest,
  ): Promise<MyLikeFeedsResponse> {
    return await this.userService.getMySaveFeeds(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiOperation({ summary: '내가 저장한 게시글 조회' })
  @ApiResponse({ status: 200, type: MySavePostsResponse })
  @Get('save-posts')
  async getMySavePosts(
    @CurrentUser() userId: string,
    @Query() { page, size }: PageRequest,
  ): Promise<MySavePostsResponse> {
    return await this.userService.getMySavePosts({
      userId,
      page: page ?? 1,
      size: size ?? 10,
    });
  }

  @ApiOperation({ summary: '내 앨범 목록 조회' })
  @ApiResponse({ status: 200, type: [AlbumBaseResponse] })
  @Get('albums')
  async getMyAlbums(
    @CurrentUser() userId: string,
  ): Promise<AlbumBaseResponse[]> {
    return await this.userService.getAlbumsByUserId(userId);
  }
}
