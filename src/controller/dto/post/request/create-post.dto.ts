import { ApiProperty } from '@nestjs/swagger';
import { Length, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PostTypes, PostType } from 'src/common/constants';

export class CreatePostDto {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @Transform(({ value }) => value.trim())
  @Length(1, 32)
  title: string;

  @ApiProperty({ minLength: 1 })
  @Length(1)
  content: string;

  @ApiProperty({ enum: PostTypes })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(PostTypes)
  type: PostType;
}
