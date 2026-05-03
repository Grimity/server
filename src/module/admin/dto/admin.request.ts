import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AdminLoginRequest {
  @ApiProperty()
  @IsString()
  @Length(1)
  id: string;

  @ApiProperty()
  @IsString()
  @Length(1)
  password: string;
}
