import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeedService } from './feed.service';

import { PopularTagResponse } from './dto';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(private feedService: FeedService) {}

  @ApiOperation({ summary: '인기 태그 조회(최대 30개)' })
  @ApiResponse({ status: 200, type: [PopularTagResponse] })
  @Get('popular')
  async findPopularTags(): Promise<PopularTagResponse[]> {
    return await this.feedService.findPopularTags();
  }
}
