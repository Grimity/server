import { ApiProperty } from '@nestjs/swagger';

export class PostIdDto {
  @ApiProperty()
  id: string;
}
