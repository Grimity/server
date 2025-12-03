import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.base.response';
import { FeedCommentBaseResponse } from './feed-comment.base.response';

export class FeedCommentWithWriterResponse extends FeedCommentBaseResponse {
  @ApiProperty({ type: UserBaseResponse })
  writer: UserBaseResponse;
}

export class ChildFeedCommentResponse extends FeedCommentWithWriterResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;

  @ApiProperty()
  isLike: boolean;
}

export class ParentFeedCommentResponse extends FeedCommentWithWriterResponse {
  @ApiProperty({ type: ChildFeedCommentResponse, isArray: true })
  childComments: ChildFeedCommentResponse[];

  @ApiProperty()
  isLike: boolean;
}
