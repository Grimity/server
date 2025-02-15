import { ApiProperty } from '@nestjs/swagger';
import { PostTypes, PostType } from 'src/common/constants';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';

class SavedPostDto {
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
