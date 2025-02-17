import { Injectable } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';
import { OpenSearchService } from '../database/opensearch/opensearch.service';

@Injectable()
export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private openSearchService: OpenSearchService,
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
    const { ids } = await this.openSearchService.searchFeed({
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
