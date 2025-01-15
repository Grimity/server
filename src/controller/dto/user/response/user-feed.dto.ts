import { ApiProperty } from '@nestjs/swagger';

export class UserFeedDto {
  @ApiProperty({ description: '피드 아이디' })
  id: string;

  @ApiProperty({ description: '피드 제목' })
  title: string;

  @ApiProperty({ example: ['feed/test.jpg'], type: 'string', isArray: true })
  cards: string[];

  @ApiProperty({ description: '피드 생성일' })
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;
}
