import { ApiProperty } from '@nestjs/swagger';
import { Length, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePostDto {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @Transform(({ value }) => value.trim())
  @Length(1, 32)
  title: string;

  @ApiProperty({ minLength: 1 })
  @Length(1)
  content: string;

  @ApiProperty({ enum: ['NORMAL', 'QUESTION', 'FEEDBACK'] })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(['NORMAL', 'QUESTION', 'FEEDBACK'])
  type: 'NORMAL' | 'QUESTION' | 'FEEDBACK';
}
