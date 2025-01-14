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

export class LinkDto {
  @ApiProperty({ example: '인스타그램' })
  @IsString()
  @IsNotEmpty()
  linkName: string;

  @ApiProperty({ example: 'https://www.instagram.com/username' })
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
  @Length(0, 50)
  description: string;

  @ApiProperty({
    type: LinkDto,
    isArray: true,
    description: '최대 3개',
    nullable: true,
  })
  @Transform(({ value }) => (value === null ? [] : value))
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links: LinkDto[];
}
