import { Injectable, Inject } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';
import { SearchService } from 'src/database/search/search.service';

@Injectable()
export class TagService {
  constructor(
    private tagRepository: TagRepository,
    @Inject(SearchService) private searchService: SearchService,
  ) {}

  async findPopularTags() {
    const cachedTags = await this.tagRepository.getCachedPopularTags();
    if (cachedTags) {
      return cachedTags;
    }
    const tags = await this.tagRepository.findPopularTags();
    await this.tagRepository.cachePopularTags(tags);

    return tags;
  }

  async searchTags(userId: string | null, tagNames: string[]) {
    const { ids } = await this.searchService.searchFeed({
      keyword: tagNames.join(' '),
      cursor: 0,
      size: 8,
      sort: 'latest',
    });
    if (ids.length === 0) {
      return [];
    }

    return await this.tagRepository.findFeedsByIds(userId, ids);
  }
}
