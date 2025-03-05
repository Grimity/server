import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from './user.response';

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
    type: IdAndNameResponse,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: IdAndNameResponse | null;

  @ApiProperty()
  isLike: boolean;
}

class ChildPostCommentResponse extends PostCommentBaseResponse {
  @ApiProperty({
    type: IdAndNameResponse,
    nullable: true,
  })
  mentionedUser: IdAndNameResponse | null;
}

export class ParentPostCommentResponse extends PostCommentBaseResponse {
  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty({ type: ChildPostCommentResponse, isArray: true })
  childComments: ChildPostCommentResponse[];
}
