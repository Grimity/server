import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from 'src/presentation/response/user.response';
export class SearchedFeedByTagsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: IdAndNameResponse })
  author: IdAndNameResponse;
}
