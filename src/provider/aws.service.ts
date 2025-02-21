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
    ext: 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp',
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

  async pushEvent(event: Event) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    const command = new SendMessageCommand({
      QueueUrl: this.configService.get('AWS_SQS_URL'),
      MessageBody: JSON.stringify(event),
    });
    await this.sqsClient.send(command);
    return;
  }
}

type FollowEvent = {
  type: 'FOLLOW';
  actorId: string;
  userId: string;
};

type FeedLikeEvent = {
  type: 'FEED_LIKE';
  feedId: string;
  likeCount: number;
};

type FeedCommentEvent = {
  type: 'FEED_COMMENT';
  feedId: string;
  actorId: string;
};

type FeedReplyEvent = {
  type: 'FEED_REPLY';
  feedId: string;
  actorId: string;
  parentId: string;
};

type FeedMentionEvent = {
  type: 'FEED_MENTION';
  feedId: string;
  actorId: string;
  mentionedUserId: string;
};

type PostCommentEvent = {
  type: 'POST_COMMENT';
  postId: string;
  actorId: string;
};

type PostReplyEvent = {
  type: 'POST_REPLY';
  postId: string;
  actorId: string;
  parentId: string;
};

type PostMentionEvent = {
  type: 'POST_MENTION';
  postId: string;
  actorId: string;
  mentionedUserId: string;
};

type Event =
  | FollowEvent
  | FeedLikeEvent
  | FeedCommentEvent
  | FeedReplyEvent
  | FeedMentionEvent
  | PostCommentEvent
  | PostReplyEvent
  | PostMentionEvent;

type GetUplodateUrlInput = {
  type: 'profile' | 'feed' | 'background' | 'post';
  ext: 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp';
};
