import { ApiProperty } from '@nestjs/swagger';

export class LikeUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;

  @ApiProperty({ description: 'not null인데 공백일수도' })
  description: string;
}
