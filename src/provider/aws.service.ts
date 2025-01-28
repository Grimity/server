import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class AwsService {
  private configService: ConfigService;
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  constructor(configService: ConfigService) {
    this.configService = configService;
    this.s3Client = new S3Client();
    this.sqsClient = new SQSClient();
  }

  async getUploadUrl(
    type: 'profile' | 'feed' | 'background' | 'post',
    ext: 'jpg' | 'jpeg' | 'png' | 'gif',
  ) {
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

  async pushEvent(event: LikeEvent | FollowEvent | CommentEvent) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    const command = new SendMessageCommand({
      QueueUrl: this.configService.get('AWS_SQS_URL'),
      MessageBody: JSON.stringify(event),
    });
    await this.sqsClient.send(command);
    return;
  }
}

export type LikeEvent = {
  type: 'LIKE';
  actorId: string;
  feedId: string;
};

export type FollowEvent = {
  type: 'FOLLOW';
  actorId: string;
  userId: string;
};

export type CommentEvent = {
  type: 'COMMENT';
  actorId: string;
  feedId: string;
  parentCommentId?: string | null;
};

type GetUplodateUrlInput = {
  type: 'profile' | 'feed' | 'background' | 'post';
  ext: 'jpg' | 'jpeg' | 'png' | 'gif';
};
