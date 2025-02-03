import { IsOptional, IsInt, Length, IsEnum } from 'class-validator';

export class SearchUserQuery {
  @Length(1, 20)
  name: string;

  @IsOptional()
  cursor?: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsEnum(['popular'])
  sort?: 'popular';
}
