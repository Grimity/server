import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class FeedCommentWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    return await this.txHost.tx.feedComment.create({
      data: {
        writerId: userId,
        feedId: input.feedId,
        parentId: input.parentCommentId ?? null,
        content: input.content,
        mentionedUserId: input.mentionedUserId ?? null,
      },
      select: { id: true },
    });
  }

  async deleteOne(userId: string, commentId: string) {
    await this.txHost.tx.feedComment.deleteMany({
      where: {
        id: commentId,
        writerId: userId,
      },
    });
    return;
  }

  async increaseLikeCount(commentId: string) {
    await this.txHost.tx.feedComment.update({
      where: { id: commentId },
      data: {
        likeCount: {
          increment: 1,
        },
      },
      select: { id: true },
    });
    return;
  }

  async decreaseLikeCount(commentId: string) {
    await this.txHost.tx.feedComment.update({
      where: { id: commentId },
      data: {
        likeCount: {
          decrement: 1,
        },
      },
      select: { id: true },
    });
    return;
  }

  async createLike(userId: string, commentId: string) {
    try {
      await this.txHost.tx.feedCommentLike.create({
        data: {
          userId,
          feedCommentId: commentId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return;
      }
      throw e;
    }
  }

  async deleteLike(userId: string, commentId: string) {
    await this.txHost.tx.feedCommentLike.deleteMany({
      where: {
        userId,
        feedCommentId: commentId,
      },
    });
    return;
  }
}

interface CreateFeedCommentInput {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
}
