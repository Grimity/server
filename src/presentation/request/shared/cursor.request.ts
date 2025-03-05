import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Length } from 'class-validator';
import { TrimAndLowerNullableString } from '../helper';

export class CursorRequest {
  @ApiProperty({ required: false, description: '없으면 처음부터' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  size?: number;
}

export class CursorKeywordRequest extends CursorRequest {
  @ApiProperty({ minLength: 2, maxLength: 20, description: '2~20' })
  @TrimAndLowerNullableString()
  @Length(2, 20)
  keyword: string;
}
