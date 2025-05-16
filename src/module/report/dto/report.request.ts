import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { refTypes } from '../../../common/constants/report';
import {
  TrimAndUpperNullableString,
  TrimNullableString,
} from '../../../shared/request/validator';

export class CreateReportRequest {
  @ApiProperty({
    description: '신고 타입, 다른건 상관없는데 기타는 0으로 보내주세요',
  })
  @IsInt()
  type: number;

  @ApiProperty({
    description: '신고 대상 타입',
    enum: refTypes,
  })
  @TrimAndUpperNullableString()
  @IsIn(refTypes)
  refType: (typeof refTypes)[number];

  @ApiProperty({
    description: '신고 대상 아이디',
  })
  @IsUUID()
  refId: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    required: false,
    maxLength: 1000,
  })
  @TrimNullableString()
  @IsOptional()
  @MaxLength(1000)
  content?: string | null;
}
