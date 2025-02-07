import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';
import { PostTypes, PostType } from 'src/common/constants';

export class PostDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PostTypes })
  type: PostType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  hasImage: boolean;

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
