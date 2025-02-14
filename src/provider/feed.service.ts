import { Injectable, HttpException } from '@nestjs/common';
import { FeedRepository } from 'src/repository/feed.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsService } from './aws.service';
import { OpenSearchService } from './opensearch.service';

@Injectable()
export class FeedService {
  constructor(
    private feedRepository: FeedRepository,
    private feedSelectRepository: FeedSelectRepository,
    private awsService: AwsService,
    private openSearchService: OpenSearchService,
  ) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    const trimmedSet = new Set(
      createFeedInput.tags.map((tag) => tag.replaceAll(' ', '')),
    );

    const { id } = await this.feedRepository.create(userId, {
      ...createFeedInput,
      tags: [...trimmedSet],
    });

    await this.openSearchService.createFeed({
      id,
      title: createFeedInput.title,
      tag: [...trimmedSet].join(' '),
    });

    return { id };
  }

  async getFeed(userId: string | null, feedId: string) {
    const feed = await this.feedSelectRepository.getFeed(userId, feedId);

    return {
      id: feed.id,
      title: feed.title,
      cards: feed.cards,
      thumbnail: feed.thumbnail,
      isAI: feed.isAI,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      content: feed.content,
      tags: feed.tags,
      author: {
        id: feed.author.id,
        name: feed.author.name,
        image: feed.author.image,
      },
      isLike: feed.isLike,
      isSave: feed.isSave,
    };
  }

  async like(userId: string, feedId: string) {
    const { likeCount } = await this.feedRepository.like(userId, feedId);

    if ([1, 5, 10, 20, 50, 100].includes(likeCount)) {
      await Promise.all([
        this.awsService.pushEvent({
          type: 'FEED_LIKE',
          feedId,
          likeCount,
        }),
        this.awsService.pushOpensearchQueue('FEED', feedId),
      ]);
    } else {
      await this.awsService.pushOpensearchQueue('FEED', feedId);
    }
    return;
  }

  async unlike(userId: string, feedId: string) {
    await this.feedRepository.unlike(userId, feedId);
    await this.awsService.pushOpensearchQueue('FEED', feedId);
    return;
  }

  async view(userId: string | null, feedId: string) {
    if (userId) {
      await Promise.all([
        this.feedRepository.createView(userId, feedId),
        this.feedRepository.increaseViewCount(feedId),
      ]);
    } else {
      await this.feedRepository.increaseViewCount(feedId);
    }
    return;
  }

  async deleteOne(userId: string, feedId: string) {
    const feed = await this.feedRepository.deleteOne(userId, feedId);

    if (!feed) {
      throw new HttpException('FEED', 404);
    }

    await this.openSearchService.deleteFeed(feedId);
    return;
  }

  async update(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
    const trimmedSet = new Set(
      updateFeedInput.tags.map((tag) => tag.replaceAll(' ', '')),
    );
    await this.feedRepository.updateOne(userId, {
      ...updateFeedInput,
      tags: [...trimmedSet],
    });
    await this.openSearchService.updateFeed({
      id: updateFeedInput.feedId,
      title: updateFeedInput.title,
      tag: [...trimmedSet].join(' '),
    });
    return;
  }

  async getLatestFeeds(userId: string | null, { cursor, size }: GetFeedsInput) {
    let lastCreatedAt: Date | null = null;
    let lastId: string | null = null;
    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2) {
        throw new HttpException('Invalid cursor', 400);
      }
      lastCreatedAt = new Date(arr[0]);
      lastId = arr[1];
    }
    const feeds = await this.feedSelectRepository.findManyLatest({
      userId,
      lastCreatedAt,
      lastId,
      size,
    });

    return {
      nextCursor:
        feeds.length === size
          ? `${feeds[size - 1].createdAt.toISOString()}_${feeds[size - 1].id}`
          : null,
      feeds: feeds.map((feed) => {
        return {
          id: feed.id,
          title: feed.title,
          thumbnail: feed.thumbnail,
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          author: feed.author,
          isLike: feed.isLike,
        };
      }),
    };
  }

  async getTodayPopular(userId: string | null) {
    let ids = await this.feedSelectRepository.getCachedTodayPopular();
    if (ids === null) {
      ids = await this.feedSelectRepository.findTodayPopularIds();
      await this.feedRepository.cacheTodayPopular(ids);
    }
    const feeds = await this.feedSelectRepository.findTodayPopularByIds(
      userId,
      ids,
    );

    return feeds.map((feed) => {
      return {
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        author: {
          id: feed.author.id,
          name: feed.author.name,
        },
        isLike: feed.likes?.length === 1,
      };
    });
  }

  async getFollowingFeeds(
    userId: string,
    {
      size,
      cursor,
    }: {
      size: number;
      cursor: string | null;
    },
  ) {
    let lastCreatedAt: Date | null = null;
    let lastId: string | null = null;
    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2) {
        throw new HttpException('Invalid cursor', 400);
      }
      lastCreatedAt = new Date(arr[0]);
      lastId = arr[1];
    }
    const feeds = await this.feedSelectRepository.findFollowingFeeds({
      userId,
      lastCreatedAt,
      lastId,
      size,
    });

    return {
      nextCursor:
        feeds.length === size
          ? `${feeds[size - 1].createdAt.toISOString()}_${feeds[size - 1].id}`
          : null,
      feeds: feeds.map((feed) => {
        return {
          id: feed.id,
          title: feed.title,
          cards: feed.cards,
          thumbnail: feed.thumbnail,
          content: feed.content,
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          isAI: feed.isAI,
          commentCount: feed.commentCount,
          author: feed.author,
          isLike: feed.isLike,
          isSave: feed.isSave,
          tags: feed.tags,
        };
      }),
    };
  }

  async save(userId: string, feedId: string) {
    await this.feedRepository.createSave(userId, feedId);
    return;
  }

  async unsave(userId: string, feedId: string) {
    await this.feedRepository.deleteSave(userId, feedId);
    return;
  }

  async search(input: SearchInput) {
    const currentCursor = input.cursor ? Number(input.cursor) : 0;
    const { ids, totalCount } = await this.openSearchService.searchFeed({
      keyword: input.keyword,
      cursor: currentCursor,
      size: input.size,
      sort: input.sort,
    });

    let nextCursor: string | null = null;

    if (ids === undefined || ids.length === 0) {
      return {
        totalCount,
        nextCursor,
        feeds: [],
      };
    }

    const feeds = await this.feedSelectRepository.findManyByIds(
      input.userId,
      ids,
    );

    if (feeds.length === input.size) {
      nextCursor = `${currentCursor + 1}`;
    }

    const returnFeeds = [];

    for (const searchedId of ids) {
      const feed = feeds.find((feed) => feed.id === searchedId);

      if (!feed) {
        continue;
      }

      returnFeeds.push({
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        commentCount: feed._count.comments,
        isLike: feed.likes?.length === 1,
        author: feed.author,
        tags: feed.tags.map(({ tagName }) => tagName),
      });
    }

    return {
      totalCount,
      nextCursor,
      feeds: returnFeeds,
    };
  }

  async getPopularFeeds({ userId, size, cursor }: GetPopularFeedsInput) {
    const feeds = await this.feedSelectRepository.findPopular({
      userId,
      size,
      cursor,
    });

    let nextCursor: string | null = null;
    if (feeds.length === size) {
      nextCursor = `${feeds[size - 1].createdAt.toISOString()}_${feeds[size - 1].id}`;
    }

    return {
      nextCursor,
      feeds: feeds.map((feed) => {
        return {
          id: feed.id,
          title: feed.title,
          thumbnail: feed.thumbnail,
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          author: feed.author,
          isLike: feed.likes?.length === 1,
        };
      }),
    };
  }

  async getLikes(feedId: string) {
    return await this.feedSelectRepository.findLikesById(feedId);
  }
}

export type GetPopularFeedsInput = {
  userId: string | null;
  size: number;
  cursor: string | null;
};
export type CreateFeedInput = {
  title: string;
  cards: string[];
  isAI: boolean;
  content: string;
  tags: string[];
  thumbnail: string;
};

export type GetFeedsInput = {
  cursor: string | null;
  size: number;
};

export type SearchInput = {
  userId: string | null;
  keyword: string;
  cursor: string | null;
  size: number;
  sort: 'latest' | 'popular' | 'accuracy';
};
