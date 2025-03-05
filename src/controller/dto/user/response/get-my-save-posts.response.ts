import { ApiProperty } from '@nestjs/swagger';
import { postTypes } from 'src/common/constants';
import { IdAndNameResponse } from 'src/presentation/response/user.response';

class SavedPostDto {
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
  createdAt: Date;

  @ApiProperty({ type: IdAndNameResponse })
  author: IdAndNameResponse;
}

export class GetMySavePostsResponse {
  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: SavedPostDto, isArray: true })
  posts: SavedPostDto[];
}
