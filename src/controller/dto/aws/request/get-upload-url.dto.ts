import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetImageUploadUrlDto {
  @ApiProperty({ enum: ['PROFILE', 'FEED'] })
  @Transform(({ value }) => value.toLowerCase())
  @IsEnum(['profile', 'feed'])
  type: 'profile' | 'feed';

  @ApiProperty({ enum: ['jpg', 'jpeg', 'png', 'gif'] })
  @IsEnum(['jpg', 'jpeg', 'png', 'gif'])
  ext: 'jpg' | 'jpeg' | 'png' | 'gif';
}
