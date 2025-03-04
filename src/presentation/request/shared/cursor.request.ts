import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

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
