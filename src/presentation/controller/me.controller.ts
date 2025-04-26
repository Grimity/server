import { Controller, UseGuards, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from 'src/provider/user.service';
import { CurrentUser } from 'src/core/decorator';
import { JwtGuard } from 'src/core/guard';
import { AlbumBaseResponse } from '../response/album.response';

@ApiTags('/me')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@UseGuards(JwtGuard)
@Controller('me')
export class MeController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '내 앨범 목록 조회' })
  @ApiResponse({ status: 200, type: [AlbumBaseResponse] })
  @Get('albums')
  async getMyAlbums(
    @CurrentUser() userId: string,
  ): Promise<AlbumBaseResponse[]> {
    return await this.userService.getAlbumsByUserId(userId);
  }
}
