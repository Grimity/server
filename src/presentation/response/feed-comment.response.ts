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
