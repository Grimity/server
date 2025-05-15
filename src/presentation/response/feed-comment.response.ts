import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from './user.response';

class FeedCommentBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: UserBaseResponse })
  writer: UserBaseResponse;
}

class ChildFeedCommentResponse extends FeedCommentBaseResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}

export class ParentFeedCommentResponse extends FeedCommentBaseResponse {
  @ApiProperty({ type: ChildFeedCommentResponse, isArray: true })
  childComments: ChildFeedCommentResponse[];
}

// TODO: 이 밑으로 다 삭제
class FeedParentCommentResponse extends FeedCommentBaseResponse {
  @ApiProperty()
  childCommentCount: number;
}

export class FeedCommentsResponse {
  @ApiProperty({ description: '총 댓글수 (대댓글 포함)' })
  commentCount: number;

  @ApiProperty({ type: FeedParentCommentResponse, isArray: true })
  comments: FeedParentCommentResponse[];
}

export class FeedChildCommentResponse extends FeedCommentBaseResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}
