import { IsOptional, IsInt } from 'class-validator';

export class GetPopularQuery {
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
