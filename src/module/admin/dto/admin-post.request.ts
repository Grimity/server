import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TrimAndUpperNullableString } from 'src/shared/request/validator';
import { GetPostsRequestTypes } from 'src/module/post/dto/post.request';

export class AdminGetPostsRequest {
  @ApiProperty({ required: false, description: '없으면 처음부터' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;

  @ApiProperty({
    enum: GetPostsRequestTypes,
    required: false,
    default: 'ALL',
  })
  @IsOptional()
  @TrimAndUpperNullableString()
  @IsIn(GetPostsRequestTypes)
  type?: (typeof GetPostsRequestTypes)[number];
}
