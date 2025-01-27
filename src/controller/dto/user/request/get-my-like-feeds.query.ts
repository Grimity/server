import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetMyLikeFeedsQuery {
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return undefined;
    return value.toLowerCase();
  })
  @IsOptional()
  @IsEnum(['latest'])
  sort?: 'latest';

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
