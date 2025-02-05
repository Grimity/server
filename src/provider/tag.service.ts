import { Injectable } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';
import { OpenSearchService } from './opensearch.service';

@Injectable()
export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private openSearchService: OpenSearchService,
  ) {}

  async findPopularTags() {
    return await this.tagRepository.findPopularTags();
  }

  async searchTags(userId: string | null, tagNames: string[]) {
    const feedIds = await this.openSearchService.searchFeed({
      keyword: tagNames.join(' '),
      cursor: 0,
      size: 8,
      sort: 'latest',
    });
    if (!feedIds || feedIds.length === 0) {
      return [];
    }

    const feeds = await this.tagRepository.findFeedsByIds(userId, feedIds);
    return feeds.map((feed) => {
      return {
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        likeCount: feed.likeCount,
        viewCount: feed.viewCount,
        isLike: feed.likes?.length === 1,
        author: {
          id: feed.author.id,
          name: feed.author.name,
        },
      };
    });
  }
}
