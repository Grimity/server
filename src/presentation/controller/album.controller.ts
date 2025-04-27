import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  ParseUUIDPipe,
  Param,
  HttpCode,
  Delete,
  Patch,
} from '@nestjs/common';
import { AlbumService } from 'src/provider/album.service';
import {
  CreateAlbumRequest,
  UpdateAlbumRequest,
  UpdateAlbumOrderRequest,
  InsertFeedsRequest,
} from '../request/album.request';
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
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@UseGuards(JwtGuard)
@Controller('albums')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @ApiOperation({ summary: '앨범 생성' })
  @ApiResponse({ status: 201, type: IdResponse })
  @ApiResponse({ status: 409, description: '앨범 이름 중복' })
  @Post()
  async update(
    @CurrentUser() userId: string,
    @Body() { name }: CreateAlbumRequest,
  ): Promise<IdResponse> {
    return await this.albumService.create(userId, name);
  }

  @ApiOperation({ summary: '앨범 순서 변경' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Put('order')
  async updateOrder(
    @CurrentUser() userId: string,
    @Body() { ids }: UpdateAlbumOrderRequest,
  ) {
    await this.albumService.updateOrder(userId, ids);
    return;
  }

  @ApiOperation({ summary: '앨범에 피드 넣기' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Put(':id')
  async insertFeeds(
    @CurrentUser() userId: string,
    @Body() { ids }: InsertFeedsRequest,
  ) {}

  @ApiOperation({ summary: '앨범 수정' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: '앨범 이름 중복' })
  @HttpCode(204)
  @Patch(':id')
  async updateOne(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() { name }: UpdateAlbumRequest,
  ) {
    await this.albumService.updateOne({
      userId,
      id,
      name,
    });
    return;
  }

  @ApiOperation({ summary: '앨범 삭제' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  async deleteOne(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.albumService.deleteOne(userId, id);
    return;
  }
}
