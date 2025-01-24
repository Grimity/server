import { IsOptional, IsEnum, IsInt, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFeedsByUserQuery {
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return undefined;
    return value.toLowerCase();
  })
  @IsOptional()
  @IsEnum(['latest', 'like', 'oldest'])
  sort?: 'latest' | 'like' | 'oldest';

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
