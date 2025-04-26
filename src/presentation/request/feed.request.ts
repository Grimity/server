import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  Length,
  ArrayNotEmpty,
  ArrayMaxSize,
  Validate,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  TrimString,
  IsImageWithPrefix,
  TagValidator,
  TrimAndLowerNullableString,
} from './helper';
import { CursorKeywordRequest } from './shared';

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
    maxLength: 20,
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

  @ApiProperty({ type: 'string', nullable: true, required: false })
  @IsOptional()
  @IsUUID()
  albumId?: string | null;
}

export class UpdateFeedRequest extends CreateFeedRequest {}

const searchFeedSortTypes = ['latest', 'popular', 'accuracy'] as const;
export class SearchFeedRequest extends CursorKeywordRequest {
  @ApiProperty({ enum: searchFeedSortTypes })
  @TrimAndLowerNullableString()
  @IsOptional()
  @IsIn(searchFeedSortTypes)
  sort?: (typeof searchFeedSortTypes)[number];
}
