import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';
import { postTypes } from 'src/common/constants';

export class PostDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

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
  likeCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  isSave: boolean;
}
