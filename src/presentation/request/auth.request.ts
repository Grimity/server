import { Length, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const providers = ['GOOGLE', 'KAKAO'] as const;

export class LoginRequest {
  @ApiProperty({ enum: providers, description: '대소문자 구분 X' })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(providers)
  provider: (typeof providers)[number];

  @ApiProperty()
  @Length(1)
  providerAccessToken: string;
}
