import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class PostCommentWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

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

  async create({
    userId,
    postId,
    parentCommentId,
    mentionedUserId,
    content,
  }: CreateInput) {
    return await this.txHost.tx.postComment.create({
      data: {
        writerId: userId,
        postId,
        parentId: parentCommentId,
        mentionedUserId,
        content,
      },
      select: { id: true },
    });
  }

  async increaseLikeCount(commentId: string) {
    await this.txHost.tx.postComment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
      select: { id: true },
    });
    return;
  }

  async decreaseLikeCount(commentId: string) {
    await this.txHost.tx.postComment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
      select: { id: true },
    });
    return;
  }

  async createLike(userId: string, commentId: string) {
    try {
      await this.txHost.tx.postCommentLike.create({
        data: {
          userId,
          postCommentId: commentId,
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return;
      }
      throw e;
    }
  }

  async deleteLike(userId: string, commentId: string) {
    try {
      await this.txHost.tx.postCommentLike.delete({
        where: {
          postCommentId_userId: {
            postCommentId: commentId,
            userId,
          },
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return;
      }
      throw e;
    }
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

interface CreateInput {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
}
