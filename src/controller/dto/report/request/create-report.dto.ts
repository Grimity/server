import { IsEnum, IsInt, IsUUID, ValidateIf, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { refTypes } from 'src/common/constants/report';

export class CreateReportDto {
  @IsInt()
  type: number;

  @IsEnum(refTypes)
  refType: (typeof refTypes)[number];

  @IsUUID()
  refId: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : null))
  @ValidateIf(({ content }) => content !== null && content !== undefined)
  @MaxLength(1000)
  content: string | null;
}
