import { ApiProperty } from '@nestjs/swagger';
import { Length, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
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

export class UpdateAlbumRequest extends CreateAlbumRequest {}

export class UpdateAlbumOrderRequest {
  @ApiProperty({
    type: 'string',
    isArray: true,
    description: '앨범 ID들만 배열로 담아서 주시면됩니다',
    minLength: 2,
    maxLength: 8,
  })
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  ids: string[];
}
