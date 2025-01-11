import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsEnum(['google', 'kakao'])
  provider: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerAccessToken: string;
}
