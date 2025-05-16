import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.response';

class PostCommentBaseResponse {
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

class ChildPostCommentResponse extends PostCommentBaseResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}

export class ParentPostCommentResponse extends PostCommentBaseResponse {
  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty({ type: ChildPostCommentResponse, isArray: true })
  childComments: ChildPostCommentResponse[];
}
