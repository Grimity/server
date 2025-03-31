import { Injectable, Inject } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';
import { SearchService } from 'src/database/search/search.service';
import { RedisService } from 'src/database/redis/redis.service';
import { getImageUrl } from './util/get-image-url';

@Injectable()
export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private redisService: RedisService,
    @Inject(SearchService) private searchService: SearchService,
  ) {}

  async findPopularTags() {
    let tags = (await this.redisService.getArray('popularTags')) as
      | tagWithThumbnail[]
      | null;

    if (tags === null) {
      tags = await this.tagRepository.findPopularTags();
      await this.redisService.cacheArray('popularTags', tags, 60 * 30);
    }

    return tags.map((tag) => ({
      tagName: tag.tagName,
      thumbnail: getImageUrl(tag.thumbnail),
    }));
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
