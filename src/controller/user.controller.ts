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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from 'src/provider/user.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import {
  UpdateProfileImageDto,
  GetMyFollowersQuery,
  UpdateProfileDto,
  MyProfileDto,
  UserProfileDto,
  MyFollowerResponse,
  GetFeedsByUserQuery,
  UserFeedsResponse,
  PopularUserDto,
  UpdateBackgroundImageDto,
} from 'src/controller/dto/user';

@ApiTags('/users')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, description: '성공', type: MyProfileDto })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(JwtGuard)
  @Get('me')
  async getMe(@CurrentUser() userId: string): Promise<MyProfileDto> {
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
    @Body() dto: UpdateProfileDto,
  ) {
    await this.userService.updateProfile(userId, dto);
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
    @Body() { imageName }: UpdateProfileImageDto,
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
    @Body() { imageName }: UpdateBackgroundImageDto,
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
  @ApiOperation({ summary: '내 팔로워 조회' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '없으면 처음부터',
    type: 'string',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: 'number',
    default: 20,
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyFollowerResponse,
  })
  @UseGuards(JwtGuard)
  @Get('me/followers')
  async getMyFollowers(
    @CurrentUser() userId: string,
    @Query() query: GetMyFollowersQuery,
  ): Promise<MyFollowerResponse> {
    return this.userService.getMyFollowers(userId, {
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 팔로워 삭제' })
  @ApiResponse({ status: 204, description: '성공' })
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

  @ApiOperation({ summary: '인기 유저 조회 - 팔로워 많은 순으로 4명' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: PopularUserDto,
    isArray: true,
  })
  @Get('popular')
  async getPopularUsers(): Promise<PopularUserDto[]> {
    return this.userService.getPopularUsers();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '유저 정보 조회 - Optional Guard' })
  @ApiResponse({ status: 200, description: '성공', type: UserProfileDto })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getUser(
    @CurrentUser() userId: string | null,
    @Param('id', ParseUUIDPipe) targetId: string,
  ): Promise<UserProfileDto> {
    return this.userService.getUserProfile(userId, targetId);
  }

  @ApiOperation({ summary: '유저별 피드 조회' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '없으면 처음부터',
    type: 'string',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    default: 'latest',
    description: '정렬 기준 - 대소문자 구분X',
    enum: ['latest', 'like', 'oldest'],
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '가져올 피드 개수',
    type: 'number',
    default: 20,
  })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: UserFeedsResponse,
  })
  @Get(':id/feeds')
  async getFeeds(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query() query: GetFeedsByUserQuery,
  ): Promise<UserFeedsResponse> {
    const { sort, cursor, size } = query;
    return this.userService.getFeedsByUser(userId, {
      sort: sort ?? 'latest',
      cursor: cursor ?? null,
      size: size ?? 20,
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
