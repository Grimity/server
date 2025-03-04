import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsNotEmpty,
  IsUrl,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TrimString } from './helper';

class UpdateLinkRequest {
  @ApiProperty({ example: '인스타그램' })
  @TrimString()
  @Length(1)
  linkName: string;

  @ApiProperty({ example: 'https://www.instagram.com/username' })
  @TrimString()
  @IsUrl()
  link: string;
}

export class UpdateUserRequest {
  @ApiProperty({ description: '2~12자' })
  @TrimString()
  @Length(2, 12)
  name: string;

  @ApiProperty({ description: '없으면 빈 문자열 주세요, 0~200자' })
  @TrimString()
  @Length(0, 200)
  description: string;

  @ApiProperty({
    type: UpdateLinkRequest,
    isArray: true,
    description: '최대 3개',
    nullable: true,
  })
  @Transform(({ value }) => (value === null ? [] : value))
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => UpdateLinkRequest)
  links: UpdateLinkRequest[];
}
