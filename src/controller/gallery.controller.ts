import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GalleryService } from 'src/provider/gallery.service';
import { CreateGalleryDto, GalleryIdDto } from './dto/gallery';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

@ApiTags('/galleries')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('galleries')
export class GalleryController {
  constructor(private galleryService: GalleryService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '갤러리 생성' })
  @ApiResponse({
    status: 201,
    description: '갤러리 생성 성공',
    type: GalleryIdDto,
  })
  @UseGuards(JwtGuard)
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() createGalleryDto: CreateGalleryDto,
  ): Promise<GalleryIdDto> {
    return await this.galleryService.create(userId, createGalleryDto);
  }
}
