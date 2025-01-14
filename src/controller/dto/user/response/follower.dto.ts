import { ApiProperty } from '@nestjs/swagger';

export class FollowerDto {
  @ApiProperty({ description: '팔로워의 id' })
  id: string;

  @ApiProperty({ description: '팔로워의 이름' })
  name: string;

  @ApiProperty({
    description: '팔로워의 이미지',
    nullable: true,
    type: 'string',
    example: 'profile/UUID.png',
  })
  image: string | null;

  @ApiProperty({ description: '팔로워의 팔로워 수' })
  followerCount: number;
}
