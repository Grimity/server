import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TagService } from './tag.service';

import { PopularTagResponse } from './dto/tag.response';

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
}
