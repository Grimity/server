import { Injectable, Inject } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';
import { SearchService } from 'src/database/search/search.service';
import { RedisService } from 'src/database/redis/redis.service';

@Injectable()
export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private redisService: RedisService,
    @Inject(SearchService) private searchService: SearchService,
  ) {}

  async findPopularTags() {
    const cachedTags = (await this.redisService.getArray('popularTags')) as
      | tagWithThumbnail[]
      | null;

    if (cachedTags) {
      return cachedTags;
    }
    const tags: tagWithThumbnail[] = await this.tagRepository.findPopularTags();
    await this.redisService.cacheArray('popularTags', tags, 60 * 30);

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

type tagWithThumbnail = {
  tagName: string;
  thumbnail: string;
};
