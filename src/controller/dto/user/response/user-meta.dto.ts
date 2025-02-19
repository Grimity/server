import { ApiProperty } from '@nestjs/swagger';

export class UserMetaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;
}
