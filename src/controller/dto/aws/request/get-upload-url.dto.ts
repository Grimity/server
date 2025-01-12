import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class GetImageUploadUrlDto {
  @ApiProperty({ enum: ['profile', 'gallery', 'communityPost'] })
  @IsEnum(['profile', 'gallery', 'communityPost'])
  type: 'profile' | 'gallery' | 'communityPost';

  @ApiProperty({ enum: ['jpg', 'jpeg', 'png'] })
  @IsEnum(['jpg', 'jpeg', 'png'])
  ext: 'jpg' | 'jpeg' | 'png';
}
