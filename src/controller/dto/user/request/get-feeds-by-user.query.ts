import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class GetFeedsByUserQuery {
  @IsOptional()
  @IsUUID()
  lastId?: string;

  @IsOptional()
  @IsDateString()
  lastCreatedAt?: string;
}
