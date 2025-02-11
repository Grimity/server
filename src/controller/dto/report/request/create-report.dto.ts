import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsUUID, ValidateIf, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { refTypes } from 'src/common/constants/report';

export class CreateReportDto {
  @ApiProperty({
    description: '신고 타입, 다른건 상관없는데 기타는 0으로 보내주세요',
  })
  @IsInt()
  type: number;

  @ApiProperty({
    description: '신고 대상 타입',
    enum: refTypes,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(refTypes)
  refType: (typeof refTypes)[number];

  @ApiProperty({
    description: '신고 대상 아이디',
  })
  @IsUUID()
  refId: string;

  @ApiProperty({
    description: '신고 내용',
    type: 'string',
    nullable: true,
    required: false,
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : null))
  @ValidateIf(({ content }) => content !== null && content !== undefined)
  @MaxLength(1000)
  content: string | null;
}
