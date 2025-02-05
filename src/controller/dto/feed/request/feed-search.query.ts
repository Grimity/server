import { IsOptional, Length, IsInt, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class FeedSearchQuery {
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.trim().toLowerCase();
  })
  @Length(1, 100)
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
  @IsEnum(['latest', 'popular', 'accuracy'])
  sort?: 'latest' | 'popular' | 'accuracy';
}
