import { ApiProperty } from '@nestjs/swagger';
import { Length, IsIn } from 'class-validator';
import {
  TrimString,
  TrimAndUpperNullableString,
  TrimAndLowerNullableString,
} from './helper';
import { postTypes } from '../../../src/common/constants';
import { PageRequest } from './shared';

export class CreatePostRequest {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @TrimString()
  @Length(1, 32)
  title: string;

  @ApiProperty({ minLength: 1 })
  @Length(1)
  content: string;

  @ApiProperty({ enum: postTypes })
  @TrimAndUpperNullableString()
  @IsIn(postTypes)
  type: (typeof postTypes)[number];
}

const GetPostsRequestTypes = [...postTypes, 'ALL'] as const;
export class GetPostsRequest extends PageRequest {
  @ApiProperty({ enum: GetPostsRequestTypes })
  @TrimAndUpperNullableString()
  @IsIn(GetPostsRequestTypes)
  type: (typeof GetPostsRequestTypes)[number];
}

const searchByTypes = ['combined', 'name'] as const;
export class SearchPostRequest extends PageRequest {
  @ApiProperty({ minLength: 2, maxLength: 20 })
  @TrimString()
  @Length(2, 20)
  keyword: string;

  @ApiProperty({ enum: searchByTypes })
  @TrimAndLowerNullableString()
  @IsIn(searchByTypes)
  searchBy: (typeof searchByTypes)[number];
}
