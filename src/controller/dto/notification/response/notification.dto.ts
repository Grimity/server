import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import {
  FollowData,
  FeedLikeData,
  FeedCommentData,
  FeedAnswerData,
  FeedMentionData,
  PostCommentData,
  PostAnswerData,
  PostMentionData,
} from 'src/common/constants';

@ApiExtraModels(
  FollowData,
  FeedLikeData,
  FeedCommentData,
  FeedAnswerData,
  FeedMentionData,
  PostCommentData,
  PostAnswerData,
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
      { $ref: getSchemaPath(FeedAnswerData) },
      { $ref: getSchemaPath(FeedMentionData) },
      { $ref: getSchemaPath(PostCommentData) },
      { $ref: getSchemaPath(PostAnswerData) },
      { $ref: getSchemaPath(PostMentionData) },
    ],
  })
  data:
    | FollowData
    | FeedLikeData
    | FeedCommentData
    | FeedAnswerData
    | FeedMentionData
    | PostCommentData
    | PostAnswerData
    | PostMentionData;
}
