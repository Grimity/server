import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AlbumService } from 'src/provider/album.service';
import { CreateAlbumRequest } from '../request/album.request';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';
import { IdResponse } from '../response/shared';

@ApiTags('/albums')
@Controller('albums')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @UseGuards(JwtGuard)
  @Post()
  async update(
    @CurrentUser() userId: string,
    @Body() { name }: CreateAlbumRequest,
  ): Promise<IdResponse> {
    return await this.albumService.create(userId, name);
  }
}
