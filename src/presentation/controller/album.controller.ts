import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { AlbumService } from 'src/provider/album.service';
import { UpdateAlbumsRequest } from '../request/album.request';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';

@ApiTags('/albums')
@Controller('albums')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @UseGuards(JwtGuard)
  @Put()
  async update(
    @CurrentUser() userId: string,
    @Body() { albums }: UpdateAlbumsRequest,
  ) {
    console.log(albums);
  }
}
