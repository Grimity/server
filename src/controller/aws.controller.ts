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
import { GetImageUploadUrlDto, UrlDto } from 'src/controller/dto/aws';

@ApiBearerAuth()
@ApiTags('/aws')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('aws')
export class AwsController {
  constructor(private awsService: AwsService) {}

  @ApiOperation({ summary: '이미지 업로드 URL 생성' })
  @ApiResponse({ status: 201, description: '성공', type: UrlDto })
  @UseGuards(JwtGuard)
  @Post('image-upload-url')
  async getImageUploadUrl(
    @Body() { type, ext }: GetImageUploadUrlDto,
  ): Promise<UrlDto> {
    return await this.awsService.getUploadUrl(type, ext);
  }

  @ApiOperation({ summary: '이미지 업로드 URL 생성 - 여러장' })
  @ApiBody({ type: GetImageUploadUrlDto, isArray: true })
  @ApiResponse({
    status: 201,
    description: '성공',
    type: UrlDto,
    isArray: true,
  })
  @UseGuards(JwtGuard)
  @Post('image-upload-urls')
  async getImageUploadUrls(
    @Body(
      new ParseArrayPipe({
        items: GetImageUploadUrlDto,
      }),
    )
    dtos: GetImageUploadUrlDto[],
  ) {
    return await this.awsService.getUploadUrls(dtos);
  }
}
