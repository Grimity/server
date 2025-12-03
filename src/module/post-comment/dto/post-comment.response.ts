import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.base.response';
import { PostCommentBaseResponse } from './post-comment.base.response';

export class PostCommentWithWriterResponse extends PostCommentBaseResponse {
  @ApiProperty({
    type: UserBaseResponse,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: UserBaseResponse | null;
}

export class ChildPostCommentResponse extends PostCommentWithWriterResponse {
  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}

export class ParentPostCommentResponse extends PostCommentWithWriterResponse {
  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty({ type: ChildPostCommentResponse, isArray: true })
  childComments: ChildPostCommentResponse[];
}
