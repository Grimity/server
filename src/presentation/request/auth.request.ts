import { ApiProperty } from '@nestjs/swagger';
import { Length, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { TrimString } from './helper';

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

export class RegisterRequest extends LoginRequest {
  @ApiProperty({ minLength: 2, maxLength: 12 })
  @TrimString()
  @Length(2, 12)
  name: string;
}
