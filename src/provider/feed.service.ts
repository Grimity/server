import { Injectable, HttpException, Inject } from '@nestjs/common';
import { FeedRepository } from 'src/repository/feed.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsService } from './aws.service';
import { SearchService } from 'src/database/search/search.service';
import { DdbService } from 'src/database/ddb/ddb.service';
import { RedisService } from 'src/database/redis/redis.service';
import { separator } from 'src/common/constants/separator-text';
import { getImageUrl } from './util/get-image-url';

@Injectable()
export class FeedService {
  constructor(
    private feedRepository: FeedRepository,
    private feedSelectRepository: FeedSelectRepository,
    private awsService: AwsService,
    private ddb: DdbService,
    private redisService: RedisService,
    @Inject(SearchService) private searchService: SearchService,
  ) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    const trimmedSet = new Set(
      createFeedInput.tags.map((tag) => tag.replaceAll(' ', '')),
    );

    const { id } = await this.feedRepository.create(userId, {
      ...createFeedInput,
      tags: [...trimmedSet],
    });

    await this.searchService.insertFeed({
      id,
      title: createFeedInput.title,
      tag: [...trimmedSet].join(' '),
    });

    return { id };
  }

  async getFeed(userId: string | null, feedId: string) {
    const feed = await this.feedSelectRepository.getFeed(userId, feedId);

    return {
      ...feed,
      thumbnail: getImageUrl(feed.thumbnail),
      cards: feed.cards.map((card) => getImageUrl(card)),
      author: {
        ...feed.author,
        image: getImageUrl(feed.author.image),
      },
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
        this.ddb.putItemForUpdate({
          type: 'FEED',
          id: feedId,
          count: likeCount,
        }),
      ]);
    } else {
      await this.ddb.putItemForUpdate({
        type: 'FEED',
        id: feedId,
        count: likeCount,
      });
    }
    return;
  }

  async unlike(userId: string, feedId: string) {
    const feed = await this.feedRepository.unlike(userId, feedId);
    await this.ddb.putItemForUpdate({
      type: 'FEED',
      id: feedId,
      count: feed.likeCount,
    });
    return;
  }

  async view(feedId: string) {
    await this.feedRepository.increaseViewCount(feedId);

    return;
  }

  async deleteOne(userId: string, feedId: string) {
    const feed = await this.feedRepository.deleteOne(userId, feedId);

    if (!feed) {
      throw new HttpException('FEED', 404);
    }

    await this.searchService.deleteFeed(feedId);
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
    await this.searchService.updateFeed({
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
      const arr = cursor.split(separator);
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
          ? feeds[size - 1].createdAt.toISOString() +
            separator +
            feeds[size - 1].id
          : null,
      feeds: feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
      })),
    };
  }

  async getTodayPopular(userId: string | null) {
    let ids = (await this.redisService.getArray('todayPopularFeedIds')) as
      | string[]
      | null;

    if (ids === null) {
      ids = await this.feedSelectRepository.findTodayPopularIds();
      await this.redisService.cacheArray('todayPopularFeedIds', ids, 60 * 30);
    }
    const feeds = await this.feedSelectRepository.findTodayPopularByIds(
      userId,
      ids,
    );
    return feeds.map((feed) => ({
      ...feed,
      thumbnail: getImageUrl(feed.thumbnail),
      author: {
        ...feed.author,
        image: getImageUrl(feed.author.image),
      },
    }));
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
      const arr = cursor.split(separator);
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
          ? feeds[size - 1].createdAt.toISOString() +
            separator +
            feeds[size - 1].id
          : null,
      feeds: feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        cards: feed.cards.map((card) => getImageUrl(card)),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
      })),
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
    const { ids, totalCount } = await this.searchService.searchFeed({
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

      returnFeeds.push(feed);
    }

    return {
      totalCount,
      nextCursor,
      feeds: returnFeeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
      })),
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
      nextCursor =
        feeds[size - 1].createdAt.toISOString() +
        separator +
        feeds[size - 1].id;
    }

    return {
      nextCursor,
      feeds: feeds.map((feed) => {
        return {
          id: feed.id,
          title: feed.title,
          thumbnail: getImageUrl(feed.thumbnail),
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          author: {
            ...feed.author,
            image: getImageUrl(feed.author.image),
          },
          isLike: feed.isLike,
        };
      }),
    };
  }

  async getLikes(feedId: string) {
    const users = await this.feedSelectRepository.findLikesById(feedId);
    return users.map((user) => ({
      ...user,
      image: getImageUrl(user.image),
    }));
  }

  async getMeta(id: string) {
    const feed = await this.feedSelectRepository.findMeta(id);
    return {
      ...feed,
      thumbnail: getImageUrl(feed.thumbnail),
    };
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
