import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class GetImageUploadUrlDto {
  @ApiProperty({ enum: ['profile', 'feed', 'communityPost'] })
  @IsEnum(['profile', 'feed', 'communityPost'])
  type: 'profile' | 'feed' | 'communityPost';

  @ApiProperty({ enum: ['jpg', 'jpeg', 'png'] })
  @IsEnum(['jpg', 'jpeg', 'png'])
  ext: 'jpg' | 'jpeg' | 'png';
}
