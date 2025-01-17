import { ApiProperty } from '@nestjs/swagger';

class WriterDto {
  @ApiProperty({ description: '작성자 ID' })
  id: string;

  @ApiProperty({ description: '작성자 이름' })
  name: string;

  @ApiProperty({
    description: '작성자 이미지',
    nullable: true,
    type: 'string',
    example: 'profile/{UUID}.jpg',
  })
  image: string | null;
}

class FeedCommentChildDto {
  @ApiProperty({ description: '댓글 ID' })
  id: string;

  @ApiProperty({ description: '부모 댓글 ID', type: 'string' })
  parentId: string | null;

  @ApiProperty({ description: '댓글 내용' })
  content: string;

  @ApiProperty({ description: '댓글 작성일시' })
  createdAt: Date;

  @ApiProperty({ description: '댓글 작성자', type: WriterDto })
  writer: WriterDto;
}

class FeedCommentParentDto {
  @ApiProperty({ description: '댓글 ID' })
  id: string;

  @ApiProperty({ description: '부모 댓글 ID', type: 'null' })
  parentId: string | null;

  @ApiProperty({ description: '댓글 내용' })
  content: string;

  @ApiProperty({ description: '댓글 작성일시' })
  createdAt: Date;

  @ApiProperty({ description: '댓글 작성자', type: WriterDto })
  writer: WriterDto;

  @ApiProperty({
    description: '대댓글',
    type: FeedCommentChildDto,
    isArray: true,
  })
  childComments: FeedCommentChildDto[];
}

export class FeedCommentResponseDto {
  @ApiProperty({ description: '총 댓글수 (대댓글 포함)' })
  commentCount: number;

  @ApiProperty({
    description: '댓글 목록',
    type: FeedCommentParentDto,
    isArray: true,
  })
  comments: FeedCommentParentDto[];
}
