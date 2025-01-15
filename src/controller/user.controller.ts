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
  UpdateProfileImageDto,
  UpdateProfileDto,
  MyProfileDto,
  UserProfileDto,
  MyFollowerDto,
  FollowerDto,
  GetFeedsByUserQuery,
} from 'src/controller/dto/user';

@ApiTags('/users')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

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
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, description: '성공', type: MyProfileDto })
  @ApiResponse({ status: 404, description: '없는 유저' })
  @UseGuards(JwtGuard)
  @Get('me')
  async getMe(@CurrentUser() userId: string): Promise<MyProfileDto> {
    return this.userService.getMyProfile(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '내 팔로워 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: MyFollowerDto,
    isArray: true,
  })
  @UseGuards(JwtGuard)
  @Get('me/followers')
  async getMyFollowers(
    @CurrentUser() userId: string,
  ): Promise<MyFollowerDto[]> {
    return this.userService.getMyFollowers(userId);
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
  @ApiResponse({ status: 200, description: '성공' })
  @Get(':id/feeds')
  async getFeeds(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query() query: GetFeedsByUserQuery,
  ) {
    if (!query.lastCreatedAt && !query.lastId) {
      console.log('here');
    } else if (query.lastCreatedAt && query.lastId) {
      console.log('here2');
    } else {
      throw new HttpException(
        'lastId나 lastCreatedAt은 하나만 있으면 안됩니다',
        400,
      );
    }
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '팔로우' })
  @ApiResponse({ status: 204, description: '성공' })
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

  @ApiOperation({ summary: '팔로워 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: FollowerDto,
    isArray: true,
  })
  @Get(':id/followers')
  async getFollowers(
    @Param('id', ParseUUIDPipe) targetId: string,
  ): Promise<FollowerDto[]> {
    return this.userService.getFollowers(targetId);
  }

  @ApiOperation({ summary: '팔로잉 조회' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: FollowerDto,
    isArray: true,
  })
  @Get(':id/followings')
  async getFollowings(
    @Param('id', ParseUUIDPipe) targetId: string,
  ): Promise<FollowerDto[]> {
    return this.userService.getFollowings(targetId);
  }
}
