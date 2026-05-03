import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { AdminPostCommentReader } from './repository/admin-post-comment.reader';
import {
  AdminPostCommentWriter,
  CreateAdminPostCommentInput,
} from './repository/admin-post-comment.writer';
import { AdminParentPostCommentResponse } from './dto/admin-post-comment.response';

@Injectable()
export class AdminPostCommentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: TypedEventEmitter,
    private readonly adminPostCommentReader: AdminPostCommentReader,
    private readonly adminPostCommentWriter: AdminPostCommentWriter,
  ) {}

  async getComments(
    postId: string,
  ): Promise<AdminParentPostCommentResponse[]> {
    return await this.adminPostCommentReader.findManyByPostId(postId);
  }

  async create(input: CreateAdminPostCommentInput) {
    const officialUserId = this.configService.get<string>('OFFICIAL_USER_ID');
    if (!officialUserId) {
      throw new HttpException('OFFICIAL_USER_ID_NOT_CONFIGURED', 500);
    }

    const checks: Promise<boolean>[] = [
      this.adminPostCommentReader.existsPost(input.postId),
    ];
    if (input.parentCommentId) {
      checks.push(
        this.adminPostCommentReader.existsComment(input.parentCommentId),
      );
    }
    const [postExists, commentExists] = await Promise.all(checks);

    if (!postExists) throw new HttpException('POST', 404);
    if (input.parentCommentId && !commentExists) {
      throw new HttpException('COMMENT', 404);
    }

    await this.createTransaction(officialUserId, input);

    if (input.mentionedUserId && input.parentCommentId) {
      this.eventEmitter.emit('notification:POST_MENTION', {
        actorId: officialUserId,
        postId: input.postId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      this.eventEmitter.emit('notification:POST_REPLY', {
        actorId: officialUserId,
        postId: input.postId,
        parentId: input.parentCommentId,
      });
    } else {
      this.eventEmitter.emit('notification:POST_COMMENT', {
        actorId: officialUserId,
        postId: input.postId,
      });
    }
    return;
  }

  @Transactional()
  async createTransaction(
    officialUserId: string,
    input: CreateAdminPostCommentInput,
  ) {
    await Promise.all([
      this.adminPostCommentWriter.create(officialUserId, input),
      this.adminPostCommentWriter.increaseCommentCount(input.postId),
    ]);
  }

  async deleteOne(commentId: string) {
    const comment = await this.adminPostCommentReader.findOneById(commentId);
    if (!comment) throw new HttpException('COMMENT', 404);

    if (comment.parentId) {
      await this.deleteChildTransaction({
        parentId: comment.parentId,
        commentId: comment.id,
        postId: comment.postId,
      });
    } else {
      await this.deleteParentTransaction({
        commentId: comment.id,
        postId: comment.postId,
      });
    }
    return;
  }

  @Transactional()
  async deleteParentTransaction(input: { commentId: string; postId: string }) {
    const { commentId, postId } = input;
    const count = await this.adminPostCommentReader.countChildComments(
      postId,
      commentId,
    );
    if (count === 0) {
      await Promise.all([
        this.adminPostCommentWriter.deleteOne(commentId),
        this.adminPostCommentWriter.decreaseCommentCount(postId),
      ]);
    } else {
      await Promise.all([
        this.adminPostCommentWriter.updateOne(commentId, {
          isDeleted: true,
          content: '',
          writerId: null,
        }),
        this.adminPostCommentWriter.decreaseCommentCount(postId),
      ]);
    }
  }

  @Transactional()
  async deleteChildTransaction(input: {
    parentId: string;
    commentId: string;
    postId: string;
  }) {
    const { parentId, commentId, postId } = input;
    const parentComment =
      await this.adminPostCommentReader.findOneById(parentId);
    const count = await this.adminPostCommentReader.countChildComments(
      postId,
      parentId,
    );

    if (!parentComment) throw new HttpException('COMMENT', 404);
    if (parentComment.isDeleted && count === 1) {
      await Promise.all([
        this.adminPostCommentWriter.deleteOne(commentId),
        this.adminPostCommentWriter.decreaseCommentCount(postId),
        this.adminPostCommentWriter.deleteOne(parentComment.id),
      ]);
    } else {
      await Promise.all([
        this.adminPostCommentWriter.deleteOne(commentId),
        this.adminPostCommentWriter.decreaseCommentCount(postId),
      ]);
    }
  }
}
