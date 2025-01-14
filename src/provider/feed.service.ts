import { Injectable } from '@nestjs/common';
import { FeedRepository } from 'src/repository/feed.repository';

@Injectable()
export class FeedService {
  constructor(private feedRepository: FeedRepository) {}

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
}

export type CreateFeedInput = {
  title: string;
  cards: string[];
  isAI: boolean;
  content: string;
  tags: string[];
};
