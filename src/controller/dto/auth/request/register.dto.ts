import { IsNotEmpty, IsString, IsEnum, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ enum: ['GOOGLE', 'KAKAO'] })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(['GOOGLE', 'KAKAO'])
  provider: 'GOOGLE' | 'KAKAO';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerAccessToken: string;

  @ApiProperty({ description: '이름, 1~10자' })
  @IsString()
  @Length(1, 10)
  name: string;
}
