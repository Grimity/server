import { IsOptional, IsInt, IsString } from 'class-validator';

export class GetTodayPopularQuery {
  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
