import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateProfileImageDto {
  @ApiProperty({ example: 'profile/{UUID}.jpg' })
  @IsString()
  @IsNotEmpty()
  filename: string;
}
