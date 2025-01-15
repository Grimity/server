import { ApiProperty } from '@nestjs/swagger';

export class AuthorSimpleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: '작성자 이미지',
    nullable: true,
    example: 'profile/{UUID}.jpg',
    type: 'string',
  })
  image: string | null;
}

export class GetFeedsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.png'] })
  cards: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ description: '비 로그인유저면 false 고정' })
  isLike: boolean;

  @ApiProperty({ type: AuthorSimpleDto })
  author: AuthorSimpleDto;
}
