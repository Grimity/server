import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetImageUploadUrlDto {
  @ApiProperty({
    enum: ['PROFILE', 'FEED', 'BACKGROUND'],
    description: '대소문자 구분 없습니다',
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEnum(['profile', 'feed', 'background', 'post'])
  type: 'profile' | 'feed' | 'background' | 'post';

  @ApiProperty({ enum: ['jpg', 'jpeg', 'png', 'gif'] })
  @IsEnum(['jpg', 'jpeg', 'png', 'gif'])
  ext: 'jpg' | 'jpeg' | 'png' | 'gif';
}
