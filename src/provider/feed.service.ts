import { Injectable, HttpException } from '@nestjs/common';
import { FeedRepository } from 'src/repository/feed.repository';
import { AwsService } from './aws.service';

@Injectable()
export class FeedService {
  constructor(
    private feedRepository: FeedRepository,
    private awsService: AwsService,
  ) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.feedRepository.create(userId, createFeedInput);
  }

  async getFeed(userId: string | null, feedId: string) {
    if (userId) {
      return await this.getFeedWithLogin(userId, feedId);
    } else {
      return await this.getFeedWithoutLogin(feedId);
    }
  }

  async getFeedWithLogin(userId: string, feedId: string) {
    const feed = await this.feedRepository.getFeedWithLogin(userId, feedId);

    return {
      id: feed.id,
      title: feed.title,
      cards: feed.cards,
      isAI: feed.isAI,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      content: feed.content,
      tags: feed.tags.map(({ tagName }) => tagName),
      author: {
        id: feed.author.id,
        name: feed.author.name,
        image: feed.author.image,
        followerCount: feed.author._count.followers,
        isFollowing:
          feed.author.followers.length === 1 &&
          feed.author.followers[0].followerId === userId,
      },
      isLike: feed.likes.length === 1 && feed.likes[0].userId === userId,
    };
  }

  async getFeedWithoutLogin(feedId: string) {
    const feed = await this.feedRepository.getFeedWithoutLogin(feedId);
    return {
      id: feed.id,
      title: feed.title,
      cards: feed.cards,
      isAI: feed.isAI,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      content: feed.content,
      tags: feed.tags.map(({ tagName }) => tagName),
      author: {
        id: feed.author.id,
        name: feed.author.name,
        image: feed.author.image,
        followerCount: feed.author._count.followers,
        isFollowing: false,
      },
      isLike: false,
    };
  }

  async like(userId: string, feedId: string) {
    await this.feedRepository.like(userId, feedId);
    await this.awsService.pushEvent({
      type: 'LIKE',
      actorId: userId,
      feedId,
    });
    return;
  }

  async unlike(userId: string, feedId: string) {
    await this.feedRepository.unlike(userId, feedId);
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
    await this.feedRepository.deleteOne(userId, feedId);
    return;
  }

  async update(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
    await this.feedRepository.updateOne(userId, updateFeedInput);
    return;
  }

  async getFeeds(userId: string | null, { cursor, size }: GetFeedsInput) {
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
    const feeds = await this.feedRepository.findMany({
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
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          commentCount: feed._count.feedComments,
          author: feed.author,
          isLike: feed.likes?.length === 1,
        };
      }),
    };
  }

  async getTodayPopular({
    userId,
    size,
    cursor,
  }: {
    userId: string | null;
    size: number;
    cursor: string | null;
  }) {
    let parsedCursor: [number, string] | null = null;
    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2) {
        throw new HttpException('Invalid cursor', 400);
      }
      parsedCursor = [Number(arr[0]), arr[1]];
    }
    const feeds = await this.feedRepository.findTodayPopular({
      userId,
      size,
      likeCount: parsedCursor ? parsedCursor[0] : null,
      feedId: parsedCursor ? parsedCursor[1] : null,
    });

    return {
      feeds: feeds.map((feed) => {
        return {
          id: feed.id,
          title: feed.title,
          cards: feed.cards,
          thumbnail: feed.thumbnail,
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          commentCount: feed._count.feedComments,
          author: feed.author,
          isLike: feed.likes?.length === 1,
        };
      }),
      nextCursor:
        feeds.length === size
          ? `${feeds[size - 1].likeCount}_${feeds[size - 1].id}`
          : null,
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
    const feeds = await this.feedRepository.findFollowingFeeds({
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
          content: feed.content,
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          commentCount: feed._count.feedComments,
          author: feed.author,
          isLike: feed.likes?.length === 1,
        };
      }),
    };
  }
}

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
