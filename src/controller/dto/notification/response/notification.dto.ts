import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import {
  FollowData,
  FeedLikeData,
  FeedCommentData,
  FeedReplyData,
  FeedMentionData,
  PostCommentData,
  PostReplyData,
  PostMentionData,
} from 'src/common/constants';

@ApiExtraModels(
  FollowData,
  FeedLikeData,
  FeedCommentData,
  FeedReplyData,
  FeedMentionData,
  PostCommentData,
  PostReplyData,
  PostMentionData,
)
export class NotificationDto {
  @ApiProperty({ description: '알림 아이디' })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(FollowData) },
      { $ref: getSchemaPath(FeedLikeData) },
      { $ref: getSchemaPath(FeedCommentData) },
      { $ref: getSchemaPath(FeedReplyData) },
      { $ref: getSchemaPath(FeedMentionData) },
      { $ref: getSchemaPath(PostCommentData) },
      { $ref: getSchemaPath(PostReplyData) },
      { $ref: getSchemaPath(PostMentionData) },
    ],
  })
  data:
    | FollowData
    | FeedLikeData
    | FeedCommentData
    | FeedReplyData
    | FeedMentionData
    | PostCommentData
    | PostReplyData
    | PostMentionData;
}
