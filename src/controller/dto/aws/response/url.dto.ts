import { ApiProperty } from '@nestjs/swagger';

export class UrlDto {
  @ApiProperty()
  url: string;
}
