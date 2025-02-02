import { IsOptional, Length, IsInt, IsEnum } from 'class-validator';

export class FeedSearchQuery {
  @Length(1, 100)
  tag: string;

  @IsOptional()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsEnum(['latest'])
  sort?: 'latest';
}
