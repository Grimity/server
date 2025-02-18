import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';
import { PostType } from 'src/common/constants';

class PostDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['NORMAL', 'QUESTION', 'FEEDBACK'] })
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

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}

export class GetPostsResponse {
  @ApiProperty({ description: '전체 게시글 수', type: 'number' })
  totalCount: number;

  @ApiProperty({ type: PostDto, isArray: true })
  posts: PostDto[];
}
