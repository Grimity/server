import { ApiProperty } from '@nestjs/swagger';
import { SimpleWriterDto } from './simple-writer.dto';

class FeedCommentParentDto {
  @ApiProperty({ description: '댓글 ID' })
  id: string;

  @ApiProperty({ description: '댓글 내용' })
  content: string;

  @ApiProperty({ description: '댓글 작성일시' })
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  childCommentCount: number;

  @ApiProperty({ description: '댓글 작성자', type: SimpleWriterDto })
  writer: SimpleWriterDto;
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
