import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TagService } from 'src/provider/tag.service';
import { PopularTagDto } from './dto/tag';

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
}
