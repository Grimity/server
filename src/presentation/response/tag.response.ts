import { ApiProperty } from '@nestjs/swagger';

export class PopularTagResponse {
  @ApiProperty()
  tagName: string;

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;
}
