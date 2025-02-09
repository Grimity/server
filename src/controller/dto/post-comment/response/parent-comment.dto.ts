import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';

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
    type: IdAndNameDto,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: IdAndNameDto | null;

  @ApiProperty({
    type: IdAndNameDto,
    nullable: true,
  })
  mentionedUser: IdAndNameDto | null;

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
    type: IdAndNameDto,
    nullable: true,
    description: 'null이면 익명화',
  })
  writer: IdAndNameDto | null;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: PostChildCommentDto, isArray: true })
  childComments: PostChildCommentDto[];
}
