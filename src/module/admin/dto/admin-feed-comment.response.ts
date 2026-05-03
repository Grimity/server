import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from 'src/shared/response/cursor.response';

export class AdminFeedCommentWriterResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;
}

export class AdminFeedCommentFeedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;
}

export class AdminLatestFeedCommentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: '대댓글이면 부모 댓글 id, 일반 댓글이면 null',
  })
  parentId: string | null;

  @ApiProperty({ type: AdminFeedCommentWriterResponse })
  writer: AdminFeedCommentWriterResponse;

  @ApiProperty({ type: AdminFeedCommentFeedResponse })
  feed: AdminFeedCommentFeedResponse;
}

export class AdminLatestFeedCommentsResponse extends CursorResponse {
  @ApiProperty({ type: AdminLatestFeedCommentResponse, isArray: true })
  comments: AdminLatestFeedCommentResponse[];
}
