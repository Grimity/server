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
import { Type } from 'class-transformer';

export class LinkDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  linkName: string;

  @ApiProperty()
  @IsUrl()
  link: string;
}

export class UpdateProfileDto {
  @ApiProperty()
  @IsString()
  @Length(1, 10)
  name: string;

  @ApiProperty({ description: '없으면 빈 문자열 주세요' })
  @IsString()
  @Length(0, 24)
  description: string;

  @ApiProperty({ type: LinkDto, isArray: true, description: '최대 3개' })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links: LinkDto[];
}
