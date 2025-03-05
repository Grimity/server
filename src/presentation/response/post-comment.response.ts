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
}
