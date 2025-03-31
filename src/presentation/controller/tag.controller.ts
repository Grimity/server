import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TagService } from 'src/provider/tag.service';
import { OptionalJwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';

import { PopularTagResponse } from '../response/tag.response';
import { SearchedFeedByTagsResponse } from '../response/feed.response';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(private tagService: TagService) {}

  @ApiOperation({ summary: '인기 태그 조회(최대 30개)' })
  @ApiResponse({ status: 200, type: [PopularTagResponse] })
  @Get('popular')
  async findPopularTags(): Promise<PopularTagResponse[]> {
    return await this.tagService.findPopularTags();
  }

  @ApiBearerAuth()
  @ApiQuery({ name: 'tagNames', type: 'string', example: '태그1,태그2,태그3' })
  @ApiOperation({ summary: '태그 여러개 검색 - Optional Guard' })
  @ApiResponse({ status: 200, type: [SearchedFeedByTagsResponse] })
  @UseGuards(OptionalJwtGuard)
  @Get('search')
  async searchTags(
    @CurrentUser() userId: string | null,
    @Query('tagNames') tagNames: string,
  ): Promise<SearchedFeedByTagsResponse[]> {
    if (!tagNames) {
      throw new HttpException('태그를 입력해주세요.', 400);
    }
    const trimmedTag = new Set(tagNames.split(',').map((tag) => tag.trim()));
    const tags = [...trimmedTag];
    if (tags.length === 0 || tags.length > 10) {
      throw new HttpException('태그는 1개 이상 10개 이하로 입력해주세요.', 400);
    }
    return await this.tagService.searchTags(userId, tags);
  }
}
