import { IsInt, IsOptional } from 'class-validator';

export class GetMyPostsQuery {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  size?: number;
}
