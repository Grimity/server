import { Injectable, HttpException, Inject } from '@nestjs/common';
import { FeedWriter } from './repository/feed.writer';
import { FeedReader } from './repository/feed.reader';
import { SearchService } from 'src/database/search/search.service';
import { DdbService } from 'src/database/ddb/ddb.service';
import { RedisService } from 'src/database/redis/redis.service';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class FeedService {
  constructor(
    private feedWriter: FeedWriter,
    private feedReader: FeedReader,
    private ddb: DdbService,
    private redisService: RedisService,
    @Inject(SearchService) private searchService: SearchService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    const trimmedSet = new Set(
      createFeedInput.tags.map((tag) =>
        tag.replaceAll(' ', '').replaceAll('#', ''),
      ),
    );

    const { id } = await this.feedWriter.create(userId, {
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
    const feed = await this.feedReader.getFeed(userId, feedId);
    if (!feed) throw new HttpException('FEED', 404);

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
    const [feedExists, likeExists] = await Promise.all([
      this.feedReader.exists(feedId),
      this.feedReader.existsLike(userId, feedId),
    ]);

    if (!feedExists) throw new HttpException('FEED', 404);
    if (likeExists) return;

    const feed = await this.likeTransaction(userId, feedId);
    if (feed === null) return;

    if ([1, 5, 10, 20, 50, 100].includes(feed.likeCount)) {
      this.eventEmitter.emit('notification:FEED_LIKE', {
        feedId,
        likeCount: feed.likeCount,
      });
    }

    await this.ddb.putItemForUpdate({
      type: 'FEED',
      id: feedId,
      count: feed.likeCount,
    });

    return;
  }

  @Transactional()
  async likeTransaction(userId: string, feedId: string) {
    const [_, feed] = await Promise.all([
      this.feedWriter.createLike(userId, feedId),
      this.feedWriter.increaseLikeCount(feedId),
    ]);
    return feed;
  }

  async unlike(userId: string, feedId: string) {
    const [feedExists, likeExists] = await Promise.all([
      this.feedReader.exists(feedId),
      this.feedReader.existsLike(userId, feedId),
    ]);

    if (!feedExists) throw new HttpException('FEED', 404);
    if (!likeExists) return;

    const feed = await this.unlikeTransaction(userId, feedId);
    if (feed === null) return;

    await this.ddb.putItemForUpdate({
      type: 'FEED',
      id: feedId,
      count: feed.likeCount,
    });
    return;
  }

  @Transactional()
  async unlikeTransaction(userId: string, feedId: string) {
    const [_, feed] = await Promise.all([
      this.feedWriter.deleteLike(userId, feedId),
      this.feedWriter.decreaseLikeCount(feedId),
    ]);
    return feed;
  }

  async view(feedId: string) {
    await this.feedWriter.increaseViewCount(feedId);

    return;
  }

  async deleteOne(userId: string, feedId: string) {
    const exists = await this.feedReader.exists(feedId);
    if (!exists) throw new HttpException('FEED', 404);

    const feed = await this.feedWriter.deleteOne(userId, feedId);

    await this.searchService.deleteFeed(feedId);
    return;
  }

  async update(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
    const exists = await this.feedReader.exists(updateFeedInput.feedId);
    if (!exists) throw new HttpException('FEED', 404);

    const trimmedSet = new Set(
      updateFeedInput.tags.map((tag) =>
        tag.replaceAll(' ', '').replaceAll('#', ''),
      ),
    );

    await this.updateTransaction(userId, {
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

  @Transactional()
  async updateTransaction(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
    await this.feedWriter.deleteTags(updateFeedInput.feedId);
    await Promise.all([
      this.feedWriter.createTags(updateFeedInput.feedId, updateFeedInput.tags),
      this.feedWriter.updateOne(userId, updateFeedInput),
    ]);
  }

  async getLatestFeeds(userId: string | null, { cursor, size }: GetFeedsInput) {
    const result = await this.feedReader.findManyLatestWithCursor({
      userId,
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      feeds: result.feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
      })),
    };
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
    const result = await this.feedReader.findFollowingFeedsWithCursor({
      userId,
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      feeds: result.feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        cards: feed.cards.map((card) => getImageUrl(card)),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
        comment: feed.comment
          ? {
              ...feed.comment,
              writer: {
                ...feed.comment.writer,
                image: getImageUrl(feed.comment.writer.image),
              },
            }
          : null,
      })),
    };
  }

  async save(userId: string, feedId: string) {
    const exists = await this.feedReader.exists(feedId);
    if (!exists) throw new HttpException('FEED', 404);

    await this.feedWriter.createSave(userId, feedId);
    return;
  }

  async unsave(userId: string, feedId: string) {
    await this.feedWriter.deleteSave(userId, feedId);
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

    const feeds = await this.feedReader.findManyByIds(input.userId, ids);

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

  async getLikes(feedId: string) {
    const users = await this.feedReader.findLikesById(feedId);
    return users.map((user) => ({
      ...user,
      image: getImageUrl(user.image),
    }));
  }

  async getMeta(id: string) {
    const feed = await this.feedReader.findMeta(id);
    if (!feed) throw new HttpException('FEED', 404);

    return {
      ...feed,
      thumbnail: getImageUrl(feed.thumbnail),
    };
  }

  async deleteMany(userId: string, ids: string[]) {
    const count = await this.feedWriter.deleteMany(userId, ids);

    if (count === ids.length) {
      await this.searchService.deleteFeeds(ids);
    }

    return;
  }

  async getRankingsByDateRange({
    userId,
    startDate,
    endDate,
  }: {
    userId: string | null;
    startDate: string;
    endDate: string;
  }) {
    let ids = (await this.redisService.getArray(
      `${startDate}-${endDate}-feed-rankings`,
    )) as string[] | null;

    if (ids === null) {
      ids = await this.feedReader.findIdsByDateRange({
        startDate,
        endDate,
      });
      await this.redisService.cacheArray(
        `${startDate}-${endDate}-feed-rankings`,
        ids,
        60 * 30,
      );
    }

    const feeds = await this.feedReader.findManyByIdsOrderByLikeCount(
      userId,
      ids,
    );

    return {
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

  async getRankingsByMonth(userId: string | null, date: string) {
    const [year, month] = date.split('-');

    let ids = (await this.redisService.getArray(`${date}-feed-rankings`)) as
      | string[]
      | null;

    if (ids === null) {
      ids = await this.feedReader.findRankingIdsByMonth({
        year: Number(year),
        month: Number(month),
      });
      await this.redisService.cacheArray(`${date}-feed-rankings`, ids, 60 * 30);
    }

    const feeds = await this.feedReader.findManyByIdsOrderByLikeCount(
      userId,
      ids,
    );

    return {
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

  async findPopularTags() {
    let tags = (await this.redisService.getArray('popularTags')) as
      | tagWithThumbnail[]
      | null;

    if (tags === null) {
      tags = await this.feedReader.findPopularTagsByDateRange(
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        new Date(),
      );
      await this.redisService.cacheArray('popularTags', tags, 60 * 30);
    }

    return tags.map((tag) => ({
      tagName: tag.tagName,
      thumbnail: getImageUrl(tag.thumbnail),
    }));
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
  content: string;
  tags: string[];
  thumbnail: string;
  albumId: string | null;
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

type tagWithThumbnail = {
  tagName: string;
  thumbnail: string;
};
