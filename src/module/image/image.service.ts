import { Injectable } from '@nestjs/common';
import { exts, imageTypes } from 'src/common/constants/image.constant';
import { S3Service } from 'src/infrastructure/s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImageService {
  constructor(
    private s3Service: S3Service,
    private configService: ConfigService,
  ) {}

  async createImageUploadUrl(
    type: (typeof imageTypes)[number],
    ext: (typeof exts)[number],
  ) {
    const key = `${type}/${crypto.randomUUID()}.${ext}`;
    const presignedUrl = await this.s3Service.createImageUploadUrl(key);

    return {
      uploadUrl: presignedUrl,
      imageName: key,
      imageUrl: `${this.configService.get('IMAGE_URL')}/${key}`,
    };
  }
}
