import { ApiProperty } from '@nestjs/swagger';
import { SimpleAuthorDto } from '../../feed/response/simple-author.dto';
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
  commentCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: SimpleAuthorDto })
  author: SimpleAuthorDto;
}
