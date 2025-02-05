import { ApiProperty } from '@nestjs/swagger';

export class PopularUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;

  @ApiProperty({ description: 'not null인데 공백일수도' })
  description: string;

  @ApiProperty()
  followerCount: number;

  @ApiProperty({ description: '내가 팔로우하고 있는지 여부' })
  isFollowing: boolean;

  @ApiProperty({ type: 'string', isArray: true })
  thumbnails: string[];
}
