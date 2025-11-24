import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

import { imageTypes, exts } from '../../../common/constants/image.constant';

export class GetImageUploadUrlRequest {
  @ApiProperty({
    enum: imageTypes,
    description: '대소문자 구분 없습니다',
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsIn(imageTypes)
  type: (typeof imageTypes)[number];

  @ApiProperty({ enum: exts })
  @IsIn(exts)
  ext: (typeof exts)[number];

  @ApiProperty()
  @IsInt()
  width: number;

  @ApiProperty()
  @IsInt()
  height: number;
}
