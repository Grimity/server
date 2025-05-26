import { Injectable, Inject } from '@nestjs/common';
import { TagRepository } from './repository/tag.repository';
import { SearchService } from 'src/database/search/search.service';
import { RedisService } from 'src/database/redis/redis.service';
import { getImageUrl } from 'src/shared/util/get-image-url';

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
}

type tagWithThumbnail = {
  tagName: string;
  thumbnail: string;
};
