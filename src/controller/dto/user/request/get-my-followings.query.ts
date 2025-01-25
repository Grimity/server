import { IsOptional, IsUUID, IsInt } from 'class-validator';

export class GetMyFollowingsQuery {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
