import {
  Controller,
  UseGuards,
  Post,
  Body,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { AwsService } from 'src/provider/aws.service';
import { JwtGuard } from 'src/common/guard';
import { UrlDto } from 'src/controller/dto/aws';
import { GetPresignedUrlRequest } from '../request/aws.request';

@ApiBearerAuth()
@ApiTags('/aws')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@UseGuards(JwtGuard)
@Controller('aws')
export class AwsController {
  constructor(private awsService: AwsService) {}

  @ApiOperation({ summary: '이미지 업로드 URL 생성' })
  @ApiResponse({ status: 201, description: '성공', type: UrlDto })
  @Post('image-upload-url')
  async getImageUploadUrl(
    @Body() { type, ext }: GetPresignedUrlRequest,
  ): Promise<UrlDto> {
    return await this.awsService.getUploadUrl(type, ext);
  }

  @ApiOperation({ summary: '이미지 업로드 URL 생성 - 여러장' })
  @ApiBody({ type: GetPresignedUrlRequest, isArray: true })
  @ApiResponse({
    status: 201,
    description: '성공',
    type: UrlDto,
    isArray: true,
  })
  @Post('image-upload-urls')
  async getImageUploadUrls(
    @Body(
      new ParseArrayPipe({
        items: GetPresignedUrlRequest,
      }),
    )
    dtos: GetPresignedUrlRequest[],
  ) {
    return await this.awsService.getUploadUrls(dtos);
  }
}
