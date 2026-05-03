import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class AdminFeedCommentWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(
    officialUserId: string,
    input: CreateAdminFeedCommentInput,
  ) {
    return await this.txHost.tx.feedComment.create({
      data: {
        writerId: officialUserId,
        feedId: input.feedId,
        parentId: input.parentCommentId ?? null,
        content: input.content,
        mentionedUserId: input.mentionedUserId ?? null,
      },
      select: { id: true },
    });
  }

  async deleteOne(commentId: string) {
    await this.txHost.tx.feedComment.deleteMany({
      where: { id: commentId },
    });
    return;
  }
}

export interface CreateAdminFeedCommentInput {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
}
