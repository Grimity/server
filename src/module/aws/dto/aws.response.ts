import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlResponse {
  @ApiProperty({ description: 'presignedUrl' })
  url: string;

  @ApiProperty({ example: 'feed/UUID.webp' })
  imageName: string;
}
