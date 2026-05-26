import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TrimNullableString } from '../../../shared/request/validator';

export class CommissionAnswerItem {
  @ApiProperty({
    required: false,
    nullable: true,
    maxLength: 2000,
    description: 'TEXT 응답. SELECT 질문이면 null.',
  })
  @IsOptional()
  @TrimNullableString()
  @MaxLength(2000)
  text?: string | null;

  @ApiProperty({
    required: false,
    isArray: true,
    type: 'string',
    description:
      'SELECT 응답. SINGLE은 길이 1, MULTI는 길이 N. TEXT면 빈 배열.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  selectedOptions?: string[];
}

export class CreateCommissionWorkRequest {
  @ApiProperty({ description: '수신자(작가) userId', format: 'uuid' })
  @IsUUID()
  authorId: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    example: ['v2/commission-work/{UUID}.jpg'],
    maxLength: 10,
    description: '레퍼런스 이미지 (0~10개)',
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  referenceImages: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    format: 'uuid',
    description: '있으면 FORM 모드(폼 신청), 없으면 DIRECT 모드(직접 의뢰)',
  })
  @IsOptional()
  @IsUUID()
  commissionId?: string | null;

  @ApiProperty({
    required: false,
    type: [CommissionAnswerItem],
    maxLength: 20,
    description:
      'FORM 모드일 때만. 배열 인덱스 = 질문 order. questions 순서대로 전송.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CommissionAnswerItem)
  answers?: CommissionAnswerItem[];

  @ApiProperty({
    required: false,
    minLength: 1,
    maxLength: 500,
    description: 'DIRECT 모드일 때만 필수. 자유 설명.',
  })
  @IsOptional()
  @Length(1, 500)
  description?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'DIRECT 모드일 때 선택. 가격 선 제시 (원). 0 가능.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  proposedPrice?: number | null;
}
