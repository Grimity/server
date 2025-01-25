import { IsOptional, IsUUID, IsInt } from 'class-validator';

export class GetMyFollowersQuery {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
