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
import { PopularTagDto, SearchedFeedByTagsDto } from 'src/controller/dto/tag';
import { OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(private tagService: TagService) {}

  @ApiOperation({ summary: '인기 태그 조회(최대 30개)' })
  @ApiResponse({ status: 200, type: PopularTagDto, isArray: true })
  @Get('popular')
  async findPopularTags(): Promise<PopularTagDto[]> {
    return await this.tagService.findPopularTags();
  }

  @ApiBearerAuth()
  @ApiQuery({ name: 'tagNames', type: 'string', example: '태그1,태그2,태그3' })
  @ApiOperation({ summary: '태그 여러개 검색 - Optional Guard' })
  @ApiResponse({ status: 200, type: SearchedFeedByTagsDto, isArray: true })
  @UseGuards(OptionalJwtGuard)
  @Get('search')
  async searchTags(
    @CurrentUser() userId: string | null,
    @Query('tagNames') tagNames: string,
  ): Promise<SearchedFeedByTagsDto[]> {
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
