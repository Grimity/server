import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  Length,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrimString } from './helper';

class UpdateAlbumRequest {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'id가 없거나 null이면 새로 추가된 앨범인걸로 간주합니다.',
  })
  @IsOptional()
  @IsUUID()
  id?: string | null;

  @ApiProperty()
  @TrimString()
  @Length(1, 30)
  name: string;
}

export class UpdateAlbumsRequest {
  @ApiProperty({ type: [UpdateAlbumRequest] })
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => UpdateAlbumRequest)
  albums: UpdateAlbumRequest[];
}
