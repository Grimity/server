import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.base.response';

export class PostCommentBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({
    type: UserBaseResponse,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: UserBaseResponse | null;

  @ApiProperty()
  isLike: boolean;
}

export class ChildPostCommentResponse extends PostCommentBaseResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}

export class ParentPostCommentResponse extends PostCommentBaseResponse {
  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty({ type: ChildPostCommentResponse, isArray: true })
  childComments: ChildPostCommentResponse[];
}
