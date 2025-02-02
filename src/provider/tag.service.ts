import { Injectable } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';

@Injectable()
export class TagService {
  constructor(private tagRepository: TagRepository) {}

  async findPopularTags() {
    return await this.tagRepository.findPopularTags();
  }

  async searchTags(userId: string | null, tagNames: string[]) {
    const feeds = await this.tagRepository.searchTags(userId, tagNames);
    return feeds.map((feed) => {
      return {
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        likeCount: feed.likeCount,
        commentCount: feed._count.feedComments,
        isLike: feed.likes?.length === 1,
        author: {
          id: feed.author.id,
          name: feed.author.name,
          image: feed.author.image,
        },
      };
    });
  }
}
