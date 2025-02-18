import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';
import { PostType, PostTypes } from 'src/common/constants';

class SearchedPostDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PostTypes })
  type: PostType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}

export class SearchPostResponse {
  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: SearchedPostDto, isArray: true })
  posts: SearchedPostDto[];
}
