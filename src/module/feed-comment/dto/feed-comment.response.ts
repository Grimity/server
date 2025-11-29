import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.dto.response';

export class FeedCommentBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ type: UserBaseResponse })
  writer: UserBaseResponse;
}

export class ChildFeedCommentResponse extends FeedCommentBaseResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;

  @ApiProperty()
  isLike: boolean;
}

export class ParentFeedCommentResponse extends FeedCommentBaseResponse {
  @ApiProperty({ type: ChildFeedCommentResponse, isArray: true })
  childComments: ChildFeedCommentResponse[];

  @ApiProperty()
  isLike: boolean;
}
