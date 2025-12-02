import { ApiProperty } from '@nestjs/swagger';

export class FeedCommentBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;
}
