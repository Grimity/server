import { ApiProperty } from '@nestjs/swagger';
import { postTypes } from '../../../common/constants/post.constant';

export class PostBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', nullable: true, description: 'FULL URL' })
  thumbnail: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class PostResponse extends PostBaseResponse {
  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;
}
