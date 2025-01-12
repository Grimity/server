import { ApiProperty } from '@nestjs/swagger';

export class GalleryIdDto {
  @ApiProperty({ description: '생성된 갤러리의 ID' })
  id: string;
}
