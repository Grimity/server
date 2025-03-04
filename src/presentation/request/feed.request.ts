import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  Length,
  ArrayNotEmpty,
  ArrayMaxSize,
  Validate,
} from 'class-validator';
import { TrimString, IsImageWithPrefix, TagValidator } from './helper';

export class CreateFeedRequest {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @TrimString()
  @Length(1, 32)
  title: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    example: ['feed/{UUID}.jpg'],
    minLength: 1,
    maxLength: 10,
  })
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsImageWithPrefix('feed/', { each: true })
  cards: string[];

  @ApiProperty()
  @IsBoolean()
  isAI: boolean;

  @ApiProperty({
    minLength: 1,
    maxLength: 300,
  })
  @Length(1, 300)
  content: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    example: ['태그1', '태그2'],
    maxLength: 10,
    description: '없으면 빈 배열',
  })
  @ArrayMaxSize(10)
  @Validate(TagValidator, { each: true })
  tags: string[];

  @ApiProperty({
    example: 'feed/{UUID}.jpg',
    description: '썸네일로 사용할 이미지명',
  })
  @IsImageWithPrefix('feed/')
  thumbnail: string;
}
