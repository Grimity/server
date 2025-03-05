import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from 'src/presentation/response/user.response';

class MyLikeFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  cards: string[];

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ description: '내가 좋아요/저장 한 시간' })
  createdAt: Date;

  @ApiProperty({ type: IdAndNameResponse })
  author: IdAndNameResponse;
}

export class MyLikeFeedsResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: MyLikeFeedDto, isArray: true })
  feeds: MyLikeFeedDto[];
}
