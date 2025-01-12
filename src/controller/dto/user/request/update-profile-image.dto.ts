import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateProfileImageDto {
  @IsString()
  @IsNotEmpty()
  filename: string;
}
