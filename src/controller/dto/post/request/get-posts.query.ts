import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetPostsQuery {
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(['ALL', 'QUESTION', 'FEEDBACK'])
  type: 'ALL' | 'QUESTION' | 'FEEDBACK';

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  size?: number;
}
