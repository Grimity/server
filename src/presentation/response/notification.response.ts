import { ApiProperty, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { UserBaseResponse } from './user.response';
import {
  NotificationData,
  FollowData,
  FeedLikeData,
  FeedCommentData,
  FeedReplyData,
  FeedMentionData,
  PostCommentData,
  PostReplyData,
  PostMentionData,
} from '../../common/constants';

// TODO: 이건 좀 아닌거같네;;
class FollowDataResponse implements FollowData {
  @ApiProperty({ enum: ['FOLLOW'] })
  type: 'FOLLOW';

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

class FeedLikeDataResponse implements FeedLikeData {
  @ApiProperty({ enum: ['FEED_LIKE'] })
  type: 'FEED_LIKE';

  @ApiProperty()
  feedId: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  title: string;
}

class FeedCommentDataResponse implements FeedCommentData {
  @ApiProperty({ enum: ['FEED_COMMENT'] })
  type: 'FEED_COMMENT';

  @ApiProperty()
  feedId: string;

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

class FeedReplyDataResponse implements FeedReplyData {
  @ApiProperty({ enum: ['FEED_REPLY'] })
  type: 'FEED_REPLY';

  @ApiProperty()
  feedId: string;

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

class FeedMentionDataResponse implements FeedMentionData {
  @ApiProperty({ enum: ['FEED_MENTION'] })
  type: 'FEED_MENTION';

  @ApiProperty()
  feedId: string;

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

class PostCommentDataResponse implements PostCommentData {
  @ApiProperty({ enum: ['POST_COMMENT'] })
  type: 'POST_COMMENT';

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

class PostReplyDataResponse implements PostReplyData {
  @ApiProperty({ enum: ['POST_REPLY'] })
  type: 'POST_REPLY';

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

class PostMentionDataResponse implements PostMentionData {
  @ApiProperty({ enum: ['POST_MENTION'] })
  type: 'POST_MENTION';

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: UserBaseResponse })
  actor: UserBaseResponse;
}

@ApiExtraModels(
  FollowDataResponse,
  FeedLikeDataResponse,
  FeedCommentDataResponse,
  FeedReplyDataResponse,
  FeedMentionDataResponse,
  PostCommentDataResponse,
  PostReplyDataResponse,
  PostMentionDataResponse,
)
export class NotificationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(FollowDataResponse) },
      { $ref: getSchemaPath(FeedLikeDataResponse) },
      { $ref: getSchemaPath(FeedCommentDataResponse) },
      { $ref: getSchemaPath(FeedReplyDataResponse) },
      { $ref: getSchemaPath(FeedMentionDataResponse) },
      { $ref: getSchemaPath(PostCommentDataResponse) },
      { $ref: getSchemaPath(PostReplyDataResponse) },
      { $ref: getSchemaPath(PostMentionDataResponse) },
    ],
  })
  data: NotificationData;
}
