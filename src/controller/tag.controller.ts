import { Controller, Get } from '@nestjs/common';
import { TagService } from 'src/provider/tag.service';

@Controller('tags')
export class TagController {
  constructor(private tagService: TagService) {}

  @Get('popular')
  async findPopularTags() {
    return await this.tagService.findPopularTags();
  }
}
