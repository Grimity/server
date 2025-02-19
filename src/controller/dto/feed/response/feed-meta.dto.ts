import { ApiProperty } from '@nestjs/swagger';

export class FeedMetaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: 'string', isArray: true })
  tags: string[];
}
