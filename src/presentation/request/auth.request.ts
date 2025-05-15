import { ApiProperty } from '@nestjs/swagger';
import { Length, IsIn, IsOptional, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { TrimString, TrimNullableString, UrlValidator } from './helper';

const providers = ['GOOGLE', 'KAKAO'] as const;

export class LoginRequest {
  @ApiProperty({ enum: providers, description: '대소문자 구분 X' })
  @Transform(({ value }) => value.toUpperCase())
  @IsIn(providers)
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

  @ApiProperty({
    minLength: 2,
    maxLength: 20,
    required: false,
    description: '삭제될 필드입니다',
  })
  @TrimNullableString()
  @IsOptional()
  @Length(2, 20)
  @Validate(UrlValidator)
  id: string;

  @ApiProperty({
    minLength: 2,
    maxLength: 20,
    required: false,
    description: 'id필드말고 url 필드를 써주세요',
  })
  @TrimNullableString()
  @IsOptional()
  @Length(2, 20)
  @Validate(UrlValidator)
  url: string;
}
