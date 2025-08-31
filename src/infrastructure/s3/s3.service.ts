import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private configService: ConfigService;
  private s3Client: S3Client;
  constructor(configService: ConfigService) {
    this.configService = configService;
    this.s3Client = new S3Client();
  }

  async createImageUploadUrl(key: string) {
    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_IMAGE_BUCKET_NAME'),
      Key: key,
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn: 600 });
  }
}
