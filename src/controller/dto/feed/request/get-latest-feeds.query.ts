import { IsOptional, IsString, IsInt } from 'class-validator';

export class GetLatestFeedsQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
