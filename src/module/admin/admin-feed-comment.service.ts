import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminFeedCommentReader } from './repository/admin-feed-comment.reader';
import {
  AdminFeedCommentWriter,
  CreateAdminFeedCommentInput,
} from './repository/admin-feed-comment.writer';

@Injectable()
export class AdminFeedCommentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminFeedCommentReader: AdminFeedCommentReader,
    private readonly adminFeedCommentWriter: AdminFeedCommentWriter,
  ) {}

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
