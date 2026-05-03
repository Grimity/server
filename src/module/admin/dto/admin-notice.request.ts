import { ApiProperty } from '@nestjs/swagger';
import { Length } from 'class-validator';
import { TrimString } from 'src/shared/request/validator';

export class CreateAdminNoticeRequest {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @TrimString()
  @Length(1, 32)
  title: string;

  @ApiProperty({ minLength: 1 })
  @Length(1)
  content: string;
}
