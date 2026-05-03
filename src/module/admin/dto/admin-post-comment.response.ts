import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from 'src/module/user/dto/user.base.response';

export class AdminChildPostCommentResponse {
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

  @ApiProperty({ type: UserBaseResponse, nullable: true })
  mentionedUser: UserBaseResponse | null;
}

export class AdminParentPostCommentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty({
    type: UserBaseResponse,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: UserBaseResponse | null;

  @ApiProperty({ type: AdminChildPostCommentResponse, isArray: true })
  childComments: AdminChildPostCommentResponse[];
}
