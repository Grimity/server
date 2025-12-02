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
  IsDateString,
  IsString,
} from 'class-validator';
import {
  TrimString,
  TagValidator,
  TrimAndLowerNullableString,
} from '../../../shared/request/validator';
import { CursorKeywordRequest } from '../../../shared/request/cursor.request';
import { Transform } from 'class-transformer';

export class CreateFeedRequest {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @TrimString()
  @Length(1, 32)
  title: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    example: ['v2/feed/{UUID}.jpg'],
    minLength: 1,
    maxLength: 10,
  })
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsString({ each: true })
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
    example: 'v2/feed/{UUID}.jpg',
    description: '썸네일로 사용할 이미지명',
  })
  @Length(1)
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
          if (!/^\d{4}-\d{2}$/.test(value)) return false;

          const [year, month] = value.split('-');

          const numberMonth = Number(month);

          return numberMonth >= 1 && numberMonth <= 12;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be in YYYYMM format with valid month (e.g., 202505)`;
        },
      },
    });
  };
}

export class GetRankingsRequest {
  @ApiProperty({
    required: false,
    example: '2025-05',
    description:
      'month가 있으면 month 우선적용, month랑 (startDate, endDate) 둘 다 없으면 400에러입니다',
  })
  @IsOptional()
  @IsValidMonth()
  month?: string;

  @ApiProperty({ required: false, example: '2025-05-10' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.split('T')[0]) // 날짜만 추출
  startDate?: string;

  @ApiProperty({ required: false, example: '2025-05-17' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.split('T')[0]) // 날짜만 추출
  endDate?: string;
}
