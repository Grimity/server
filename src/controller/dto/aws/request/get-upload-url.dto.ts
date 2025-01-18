import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class GetImageUploadUrlDto {
  @ApiProperty({ enum: ['profile', 'feed'] })
  @IsEnum(['profile', 'feed'])
  type: 'profile' | 'feed';

  @ApiProperty({ enum: ['jpg', 'jpeg', 'png'] })
  @IsEnum(['jpg', 'jpeg', 'png'])
  ext: 'jpg' | 'jpeg' | 'png';
}
