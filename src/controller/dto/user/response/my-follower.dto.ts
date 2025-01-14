import { ApiProperty } from '@nestjs/swagger';

export class MyFollowerDto {
  @ApiProperty({ description: '팔로워의 ID' })
  id: string;

  @ApiProperty({ description: '팔로워의 이름' })
  name: string;

  @ApiProperty({
    description: '팔로워의 이미지',
    nullable: true,
    type: 'string',
    example: 'profile/UUID.jpg',
  })
  image: string | null;

  @ApiProperty({ description: '팔로워의 팔로워 수' })
  followerCount: number;

  @ApiProperty({ description: '내가 해당 팔로워를 팔로우 중인지 여부' })
  isFollowing: boolean;
}
