import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ enum: ['GOOGLE', 'KAKAO'] })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(['GOOGLE', 'KAKAO'])
  provider: 'GOOGLE' | 'KAKAO';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerAccessToken: string;
}
