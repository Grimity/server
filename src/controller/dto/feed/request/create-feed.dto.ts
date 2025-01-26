import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  Length,
  ArrayNotEmpty,
  ArrayMaxSize,
  Validate,
} from 'class-validator';
import { IsFeedCard, IsFeedTag } from 'src/common/validator';

export class CreateFeedDto {
  @ApiProperty({ description: '1글자이상 24글자 이하' })
  @Length(1, 24)
  title: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    description: '이미지 파일명배열, 최소 1개, 최대 10개',
    example: ['feed/{UUID}.jpg'],
  })
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @Validate(IsFeedCard, { each: true })
  cards: string[];

  @ApiProperty()
  @IsBoolean()
  isAI: boolean;

  @ApiProperty({
    description: '0글자 이상 3000글자 이하, 0글자는 빈 문자열로 주세요',
  })
  @Length(0, 3000)
  content: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    description:
      '태그, 없으면 빈 배열, 최대 8개, 각 태그는 1글자 이상 10글자 이하',
    example: ['태그1', '태그2'],
  })
  @ArrayMaxSize(8)
  @Validate(IsFeedTag, { each: true })
  tags: string[];

  @ApiProperty()
  @Validate(IsFeedCard)
  thumbnail: string;
}
