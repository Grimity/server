import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  TrimNullableString,
  TrimString,
} from '../../../shared/request/validator';

export class CommissionAnswerItem {
  @ApiProperty({
    required: false,
    enum: ['TEXT', 'SINGLE_SELECT', 'MULTI_SELECT'],
    description: 'DIRECT 모드 필수. FORM 모드면 서버가 무시.',
  })
  @IsOptional()
  @IsIn(['TEXT', 'SINGLE_SELECT', 'MULTI_SELECT'])
  type?: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT';

  @ApiProperty({
    required: false,
    maxLength: 100,
    description: 'DIRECT 모드 필수. FORM 모드면 서버가 무시.',
  })
  @IsOptional()
  @TrimNullableString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    maxLength: 500,
    description: 'DIRECT 모드 선택. FORM 모드면 서버가 무시.',
  })
  @IsOptional()
  @TrimNullableString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({
    required: false,
    description: 'DIRECT 모드 선택(기본 false). FORM 모드면 서버가 무시.',
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    required: false,
    isArray: true,
    type: 'string',
    description: 'DIRECT 모드 SELECT면 필수. FORM 모드면 서버가 무시.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  options?: string[];

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

  @ApiProperty({
    required: false,
    isArray: true,
    type: 'string',
    example: ['v2/commission-work/{UUID}.jpg'],
    maxLength: 10,
    description:
      'TEXT 답변 첨부 이미지 (0~10개). SELECT 질문이면 빈 배열/생략.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  attachedImages?: string[];
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
      'FORM 모드: 배열 인덱스 = 질문 order, text/selectedOptions만 사용(메타는 서버가 무시). ' +
      'DIRECT 모드: type/title 포함한 완전한 답변 아이템.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CommissionAnswerItem)
  answers?: CommissionAnswerItem[];
}

export class UploadCommissionWorkResultRequest {
  @ApiProperty({
    isArray: true,
    type: 'string',
    example: ['v2/commission-work/{UUID}.jpg'],
    minLength: 1,
    maxLength: 20,
    description: '작업물 이미지 (1~20개)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ description: '최종 작업물 여부' })
  @IsBoolean()
  isFinal: boolean;
}

export class RejectCommissionWorkRequest {
  @ApiProperty({
    required: false,
    nullable: true,
    maxLength: 500,
    description: '거절 사유 (선택)',
  })
  @IsOptional()
  @TrimNullableString()
  @MaxLength(500)
  reason?: string | null;
}

export class CreateCommissionWorkMemoRequest {
  @ApiProperty({ minLength: 1, maxLength: 500, description: '작업 메모 내용' })
  @TrimString()
  @Length(1, 500)
  content: string;
}
