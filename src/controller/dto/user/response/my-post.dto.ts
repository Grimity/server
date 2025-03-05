import { ApiProperty } from '@nestjs/swagger';
import { PostType, postTypes } from 'src/common/constants';

export class MyPostDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: postTypes })
  type: PostType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;
}
