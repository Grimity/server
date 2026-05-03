import { HttpException, Injectable } from '@nestjs/common';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { AdminFeedReader } from './repository/admin-feed.reader';
import { AdminFeedWriter } from './repository/admin-feed.writer';
import {
  AdminFeedDetailResponse,
  AdminLatestFeedsResponse,
} from './dto/admin-feed.response';

@Injectable()
export class AdminFeedService {
  constructor(
    private readonly adminFeedReader: AdminFeedReader,
    private readonly adminFeedWriter: AdminFeedWriter,
  ) {}

  async getLatestFeeds({
    cursor,
    size,
  }: {
    cursor: string | null;
    size: number;
  }): Promise<AdminLatestFeedsResponse> {
    const result = await this.adminFeedReader.findManyLatest({ cursor, size });

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

  async getFeed(feedId: string): Promise<AdminFeedDetailResponse> {
    const feed = await this.adminFeedReader.getFeedDetail(feedId);
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

  async deleteOne(feedId: string) {
    const exists = await this.adminFeedReader.exists(feedId);
    if (!exists) throw new HttpException('FEED', 404);

    await this.adminFeedWriter.deleteOne(feedId);
    return;
  }
}
