import { ApiProperty } from '@nestjs/swagger';
import { Length, IsIn } from 'class-validator';
import { TrimString, TrimAndUpperNullableString } from './helper';
import { postTypes } from 'src/common/constants';

export class CreatePostRequest {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @TrimString()
  @Length(1, 32)
  title: string;

  @ApiProperty({ minLength: 1 })
  @Length(1)
  content: string;

  @ApiProperty({ enum: postTypes })
  @TrimAndUpperNullableString()
  @IsIn(postTypes)
  type: (typeof postTypes)[number];
}
