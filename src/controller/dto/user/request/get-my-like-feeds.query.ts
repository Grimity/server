import { IsOptional, IsString, IsInt } from 'class-validator';

export class GetMyLikeFeedsQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
