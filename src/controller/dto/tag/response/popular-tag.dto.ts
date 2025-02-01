import { ApiProperty } from '@nestjs/swagger';

export class PopularTagDto {
  @ApiProperty()
  tagName: string;

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;
}
