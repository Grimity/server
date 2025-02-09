import { IsInt, IsOptional, Length, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchPostQuery {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100)
  keyword: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsEnum(['combined', 'name'])
  searchBy: 'combined' | 'name';
}
