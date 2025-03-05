import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from 'src/presentation/response/user.response';

class PostChildCommentDto {
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

  @ApiProperty({
    type: IdAndNameResponse,
    nullable: true,
  })
  mentionedUser: IdAndNameResponse | null;

  @ApiProperty()
  isLike: boolean;
}

export class PostParentCommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ description: '삭제된 댓글 여부' })
  isDeleted: boolean;

  @ApiProperty({
    type: IdAndNameResponse,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: IdAndNameResponse | null;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: PostChildCommentDto, isArray: true })
  childComments: PostChildCommentDto[];
}
