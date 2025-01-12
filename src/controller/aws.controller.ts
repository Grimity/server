import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { AwsService } from 'src/provider/aws.service';
import { JwtGuard } from 'src/common/guard';
import { GetImageUploadUrlDto, UrlDto } from 'src/controller/dto/aws';

@Controller('aws')
export class AwsController {
  constructor(private awsService: AwsService) {}

  @UseGuards(JwtGuard)
  @Post('image-upload-url')
  async getImageUploadUrl(
    @Body() { type, ext }: GetImageUploadUrlDto,
  ): Promise<UrlDto> {
    return await this.awsService.getUploadUrl(type, ext);
  }
}
