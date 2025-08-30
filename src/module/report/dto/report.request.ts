import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID, IsOptional, MaxLength } from 'class-validator';
import {
  refTypes,
  reportTypes,
} from '../../../common/constants/report.constant';
import {
  TrimAndUpperNullableString,
  TrimNullableString,
} from '../../../shared/request/validator';

export class CreateReportRequest {
  @ApiProperty({ description: '신고 타입', enum: reportTypes })
  @IsIn(reportTypes)
  type: (typeof reportTypes)[number];
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
