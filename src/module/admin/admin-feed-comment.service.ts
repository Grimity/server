import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { AdminFeedCommentReader } from './repository/admin-feed-comment.reader';
import {
  AdminFeedCommentWriter,
  CreateAdminFeedCommentInput,
} from './repository/admin-feed-comment.writer';
import {
  AdminLatestFeedCommentsResponse,
  AdminParentFeedCommentResponse,
} from './dto/admin-feed-comment.response';

@Injectable()
export class AdminFeedCommentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminFeedCommentReader: AdminFeedCommentReader,
    private readonly adminFeedCommentWriter: AdminFeedCommentWriter,
  ) {}

  async getLatestComments({
    cursor,
    size,
  }: {
    cursor: string | null;
    size: number;
  }): Promise<AdminLatestFeedCommentsResponse> {
    const result = await this.adminFeedCommentReader.findManyLatest({
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      comments: result.comments.map((c) => ({
        ...c,
        writer: {
          ...c.writer,
          image: getImageUrl(c.writer.image),
        },
        feed: {
          ...c.feed,
          thumbnail: getImageUrl(c.feed.thumbnail),
        },
      })),
    };
  }

  async getCommentsByFeedId(
    feedId: string,
  ): Promise<AdminParentFeedCommentResponse[]> {
    const feedExists = await this.adminFeedCommentReader.existsFeed(feedId);
    if (!feedExists) throw new HttpException('FEED', 404);

    const comments =
      await this.adminFeedCommentReader.findManyByFeedId(feedId);

    return comments.map((parent) => ({
      ...parent,
      writer: { ...parent.writer, image: getImageUrl(parent.writer.image) },
      childComments: parent.childComments.map((child) => ({
        ...child,
        writer: { ...child.writer, image: getImageUrl(child.writer.image) },
        mentionedUser: child.mentionedUser
          ? {
              ...child.mentionedUser,
              image: getImageUrl(child.mentionedUser.image),
            }
          : null,
      })),
    }));
  }

  async create(input: CreateAdminFeedCommentInput) {
    const officialUserId = this.configService.get<string>('OFFICIAL_USER_ID');
    if (!officialUserId) {
      throw new HttpException('OFFICIAL_USER_ID_NOT_CONFIGURED', 500);
    }

    const checks: Promise<boolean>[] = [
      this.adminFeedCommentReader.existsFeed(input.feedId),
    ];
    if (input.parentCommentId) {
      checks.push(
        this.adminFeedCommentReader.existsComment(input.parentCommentId),
      );
    }
    const [feedExists, commentExists] = await Promise.all(checks);

    if (!feedExists) throw new HttpException('FEED', 404);
    if (input.parentCommentId && !commentExists) {
      throw new HttpException('COMMENT', 404);
    }

    await this.adminFeedCommentWriter.create(officialUserId, input);

    if (input.mentionedUserId && input.parentCommentId) {
      this.eventEmitter.emit('notification:FEED_MENTION', {
        actorId: officialUserId,
        feedId: input.feedId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      this.eventEmitter.emit('notification:FEED_REPLY', {
        actorId: officialUserId,
        feedId: input.feedId,
        parentId: input.parentCommentId,
      });
    } else {
      this.eventEmitter.emit('notification:FEED_COMMENT', {
        actorId: officialUserId,
        feedId: input.feedId,
      });
    }
    return;
  }

  async deleteOne(commentId: string) {
    const exists = await this.adminFeedCommentReader.existsComment(commentId);
    if (!exists) throw new HttpException('COMMENT', 404);

    await this.adminFeedCommentWriter.deleteOne(commentId);
    return;
  }
}
