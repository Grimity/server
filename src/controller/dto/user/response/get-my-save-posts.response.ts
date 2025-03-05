import { ApiProperty } from '@nestjs/swagger';
import { postTypes } from 'src/common/constants';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';

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

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}

export class GetMySavePostsResponse {
  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: SavedPostDto, isArray: true })
  posts: SavedPostDto[];
}
