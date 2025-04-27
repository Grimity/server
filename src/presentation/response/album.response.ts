import { ApiProperty } from '@nestjs/swagger';

export class AlbumBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
