import { ApiProperty } from '@nestjs/swagger';

export class PopularUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: 'string', example: 'profile/UUID.png' })
  image: string | null;

  @ApiProperty()
  followerCount: number;

  @ApiProperty({ description: '24시간 이내 피드 수' })
  feedCount: number;
}
