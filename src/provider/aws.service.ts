import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AwsService {
  private configService: ConfigService;
  private s3Client: S3Client;
  constructor(configService: ConfigService) {
    this.configService = configService;
    this.s3Client = new S3Client();
  }

  async getUploadUrl(type: 'profile' | 'feed', ext: 'jpg' | 'jpeg' | 'png') {
    const key = `${type}/${uuidv4()}.${ext}`;
    const url = await this.createUploadUrl(key);
    return {
      url,
      imageName: key,
    };
  }

  async getUploadUrls(inputs: GetUplodateUrlInput[]) {
    return await Promise.all(
      inputs.map(async (input) => {
        return await this.getUploadUrl(input.type, input.ext);
      }),
    );
  }

  async createUploadUrl(key: string) {
    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_IMAGE_BUCKET_NAME'),
      Key: key,
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn: 60 });
  }
}

type GetUplodateUrlInput = {
  type: 'profile' | 'feed';
  ext: 'jpg' | 'jpeg' | 'png';
};
