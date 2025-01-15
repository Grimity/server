import { IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';

export class GetFeedsQuery {
  @IsOptional()
  @IsUUID()
  lastId?: string;

  @IsOptional()
  @IsDateString()
  lastCreatedAt?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}
