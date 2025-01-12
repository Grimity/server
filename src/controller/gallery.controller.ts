import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GalleryService } from 'src/provider/gallery.service';
import { CreateGalleryDto } from './dto/gallery';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

@ApiTags('/galleries')
@Controller('galleries')
export class GalleryController {
  constructor(private galleryService: GalleryService) {}

  @UseGuards(JwtGuard)
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() createGalleryDto: CreateGalleryDto,
  ) {
    console.log(userId, createGalleryDto);
  }
}
