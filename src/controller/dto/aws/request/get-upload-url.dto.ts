import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetImageUploadUrlDto {
  @ApiProperty({ enum: ['PROFILE', 'FEED'] })
  @Transform(({ value }) => value.toLowerCase())
  @IsEnum(['profile', 'feed'])
  type: 'profile' | 'feed';

  @ApiProperty({ enum: ['jpg', 'jpeg', 'png'] })
  @IsEnum(['jpg', 'jpeg', 'png'])
  ext: 'jpg' | 'jpeg' | 'png';
}
