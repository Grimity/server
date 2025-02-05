import { IsOptional, IsInt, Length, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchUserQuery {
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.trim().toLowerCase();
  })
  @Length(1, 20)
  keyword: string;

  @IsOptional()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value.toLowerCase();
    return value;
  })
  @IsOptional()
  @IsEnum(['popular', 'accuracy'])
  sort?: 'popular' | 'accuracy';
}
