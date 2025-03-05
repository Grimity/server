import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from 'src/presentation/response/user.response';
import { postTypes } from 'src/common/constants';

class SearchedPostDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

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

  @ApiProperty({ type: IdAndNameResponse })
  author: IdAndNameResponse;
}

export class SearchPostResponse {
  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: SearchedPostDto, isArray: true })
  posts: SearchedPostDto[];
}
