import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class AdminPostCommentWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(officialUserId: string, input: CreateAdminPostCommentInput) {
    return await this.txHost.tx.postComment.create({
      data: {
        writerId: officialUserId,
        postId: input.postId,
        parentId: input.parentCommentId ?? null,
        content: input.content,
        mentionedUserId: input.mentionedUserId ?? null,
      },
      select: { id: true },
    });
  }

  async increaseCommentCount(postId: string) {
    await this.txHost.tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
      select: { id: true },
    });
    return;
  }

  async decreaseCommentCount(postId: string) {
    await this.txHost.tx.post.update({
      where: { id: postId },
      data: { commentCount: { decrement: 1 } },
      select: { id: true },
    });
    return;
  }

  async updateOne(
    commentId: string,
    input: Prisma.PostCommentUncheckedUpdateInput,
  ) {
    return await this.txHost.tx.postComment.update({
      where: { id: commentId },
      data: input,
      select: { id: true },
    });
  }

  async deleteOne(commentId: string) {
    return await this.txHost.tx.postComment.delete({
      where: { id: commentId },
      select: { id: true },
    });
  }
}

export interface CreateAdminPostCommentInput {
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
}
