import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  Length,
  ArrayNotEmpty,
  ArrayMaxSize,
  Validate,
  IsIn,
  IsOptional,
  IsUUID,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
  IsDate,
} from 'class-validator';
import {
  TrimString,
  IsImageWithPrefix,
  TagValidator,
  TrimAndLowerNullableString,
} from '../../../shared/request/validator';
import { CursorKeywordRequest } from '../../../shared/request/cursor.request';

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

export class DeleteFeedsRequest {
  @ApiProperty({ type: 'string', isArray: true, minLength: 1 })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}

export function IsValidMonth(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMonth',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          if (!/^\d{6}$/.test(value)) return false;

          const year = parseInt(value.substring(0, 4));
          const month = parseInt(value.substring(4, 6));

          return month >= 1 && month <= 12;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be in YYYYMM format with valid month (e.g., 202505)`;
        },
      },
    });
  };
}

export class GetRankingsRequest {
  @ApiProperty({ required: false, example: 202505 })
  @IsOptional()
  @IsValidMonth()
  month?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  endDate?: Date;
}
