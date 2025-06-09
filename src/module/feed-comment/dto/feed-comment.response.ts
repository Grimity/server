import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.response';

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
