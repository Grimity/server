import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AlbumService } from 'src/provider/album.service';
import { CreateAlbumRequest } from '../request/album.request';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';
import { IdResponse } from '../response/shared';

@ApiTags('/albums')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('albums')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @ApiOperation({ summary: '앨범 생성' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: '앨범 생성 성공', type: IdResponse })
  @ApiResponse({ status: 409, description: '앨범 이름 중복' })
  @UseGuards(JwtGuard)
  @Post()
  async update(
    @CurrentUser() userId: string,
    @Body() { name }: CreateAlbumRequest,
  ): Promise<IdResponse> {
    return await this.albumService.create(userId, name);
  }
}
