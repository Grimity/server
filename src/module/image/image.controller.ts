import {
  Body,
  Controller,
  Post,
  ParseArrayPipe,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetImageUploadUrlRequest } from './dto/image.request';
import { ImageUploadUrlResponse } from './dto/image.response';
import { ImageService } from './image.service';
import { JwtGuard } from 'src/core/guard';

@ApiTags('/images')
@ApiBearerAuth()
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtGuard)
@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @ApiOperation({ summary: '이미지 업로드용 presignedURL 발급' })
  @ApiResponse({ status: 200, type: ImageUploadUrlResponse })
  @Post('/get-upload-url')
  @HttpCode(200)
  async getImageUploadUrl(
    @Body() { type, ext }: GetImageUploadUrlRequest,
  ): Promise<ImageUploadUrlResponse> {
    return await this.imageService.createImageUploadUrl(type, ext);
  }

  @ApiOperation({ summary: '이미지 업로드용 presignedURL 여러개 발급' })
  @ApiBody({ type: [GetImageUploadUrlRequest] })
  @ApiResponse({ status: 200, type: [ImageUploadUrlResponse] })
  @Post('/get-upload-urls')
  @HttpCode(200)
  async getImageUploadUrls(
    @Body(new ParseArrayPipe({ items: GetImageUploadUrlRequest }))
    dtos: GetImageUploadUrlRequest[],
  ): Promise<ImageUploadUrlResponse[]> {
    return await Promise.all(
      dtos.map(({ type, ext }) =>
        this.imageService.createImageUploadUrl(type, ext),
      ),
    );
  }
}
