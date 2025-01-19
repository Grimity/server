import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFeedsByUserQuery {
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return undefined;
    return value.toLowerCase();
  })
  @IsOptional()
  @IsEnum(['latest', 'like', 'view', 'oldest'])
  sort?: 'latest' | 'like' | 'view' | 'oldest';

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsInt()
  index?: number;
}
