import { IsOptional, IsString, IsInt } from 'class-validator';

export class GetFollowingFeedsQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
