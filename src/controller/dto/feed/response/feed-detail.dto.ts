import { ApiProperty } from '@nestjs/swagger';

export class AuthorDto {
  @ApiProperty({ description: '작성자 ID' })
  id: string;

  @ApiProperty({ description: '작성자 이름' })
  name: string;

  @ApiProperty({
    description: '작성자 이미지',
    nullable: true,
    example: 'profile/{UUID}.jpg',
    type: 'string',
  })
  image: string | null;

  @ApiProperty()
  followerCount: number;

  @ApiProperty({ description: '팔로잉 여부 - 비 로그인유저면 false만 반환함' })
  isFollowing: boolean;
}

export class FeedDetailDto {
  @ApiProperty({ description: '피드 ID' })
  id: string;

  @ApiProperty({ description: '제목' })
  title: string;

  @ApiProperty({
    example: ['feed/{UUID}.jpg'],
    isArray: true,
    type: 'string',
  })
  cards: string[];

  @ApiProperty({ example: 'feed/{UUID}.jpg' })
  thumbnail: string;

  @ApiProperty()
  isAI: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  content: string;

  @ApiProperty({
    example: ['tag1'],
    isArray: true,
    type: 'string',
  })
  tags: string[];

  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiProperty({ description: '좋아요 여부' })
  isLike: boolean;

  @ApiProperty({ description: '저장 여부' })
  isSave: boolean;
}
