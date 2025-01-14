import { ApiProperty } from '@nestjs/swagger';

export class FollowerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    nullable: true,
    type: 'string',
    example: 'profile/UUID.png',
  })
  image: string | null;

  @ApiProperty()
  followerCount: number;
}
