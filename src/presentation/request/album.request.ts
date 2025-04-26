import { ApiProperty } from '@nestjs/swagger';
import { Length } from 'class-validator';
import { TrimString } from './helper';

export class CreateAlbumRequest {
  @ApiProperty({
    minLength: 1,
    maxLength: 15,
    description: '앨범 개수는 최대 8개',
  })
  @TrimString()
  @Length(1, 15)
  name: string;
}
