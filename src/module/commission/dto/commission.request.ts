import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import {
  CommissionQuestionType,
  commissionQuestionTypes,
} from '../../../common/constants/commission.constant';
import {
  TagValidator,
  TrimNullableString,
  TrimString,
} from '../../../shared/request/validator';

export class CommissionQuestionItem {
  @ApiProperty({ enum: commissionQuestionTypes })
  @IsIn(commissionQuestionTypes)
  type: CommissionQuestionType;

  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @TrimString()
  @Length(1, 1000)
  title: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 1000 })
  @IsOptional()
  @TrimNullableString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty()
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({
    isArray: true,
    type: 'string',
    description:
      'SELECT 타입일 때 선택지(길이 2 이상). TEXT면 빈 배열. 순서 = 배열 index',
    maxLength: 20,
  })
  @ArrayMaxSize(20)
  @IsString({ each: true })
  options: string[];
}

export class CreateCommissionRequest {
  @ApiProperty({ minLength: 1, maxLength: 60 })
  @TrimString()
  @Length(1, 60)
  title: string;

  @ApiProperty({ minLength: 1, maxLength: 10000, description: 'HTML 문자열' })
  @Length(1, 10000)
  description: string;

  @ApiProperty({
    required: false,
    maxLength: 10000,
    description: 'HTML 문자열 (선택)',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @MaxLength(10000)
  additionalCondition?: string | null;

  @ApiProperty({ description: '1000원 단위, 0(무료) 가능' })
  @IsInt()
  @Min(0)
  @Max(10000000)
  price: number;

  @ApiProperty({ description: '작업 기간(일)' })
  @IsInt()
  @Min(0)
  @Max(365)
  workDays: number;

  @ApiProperty({ description: '수정 횟수' })
  @IsInt()
  @Min(0)
  @Max(99)
  revisionCount: number;

  @ApiProperty({
    isArray: true,
    type: 'string',
    example: ['v2/commission/{UUID}.jpg'],
    minLength: 1,
    maxLength: 10,
  })
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ description: 'images 중 대표로 지정한 imageName' })
  @Length(1)
  thumbnail: string;

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

  @ApiProperty({ type: [CommissionQuestionItem], maxLength: 20 })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CommissionQuestionItem)
  questions: CommissionQuestionItem[];

  @ApiProperty({ description: '공개 여부 (공개=true, 비공개=false)' })
  @IsBoolean()
  isPublic: boolean;
}
