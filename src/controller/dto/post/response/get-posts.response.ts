import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';

class PostDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['NORMAL', 'QUESTION', 'FEEDBACK'] })
  type: 'NORMAL' | 'QUESTION' | 'FEEDBACK';

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
  createdAt: Date;

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}

export class GetPostsResponse {
  @ApiProperty({
    description: '전체 게시글 수 - page가 1일 때만 반환, 그 외에는 null',
    type: 'number',
    nullable: true,
  })
  totalCount: number | null;

  @ApiProperty({ type: PostDto, isArray: true })
  posts: PostDto[];
}
