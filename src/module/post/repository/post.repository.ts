import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class PostRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(input: CreateInput) {
    return await this.txHost.tx.post.create({
      data: {
        authorId: input.userId,
        title: input.title,
        content: input.content,
        type: input.type,
        thumbnail: input.thumbnail,
      },
      select: {
        id: true,
      },
    });
  }

  async update(input: UpdateInput) {
    try {
      return await this.txHost.tx.post.update({
        where: {
          id: input.postId,
          authorId: input.userId,
        },
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          thumbnail: input.thumbnail,
        },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }
  }

  async createLike(userId: string, postId: string) {
    try {
      await this.txHost.tx.postLike.create({
        data: {
          userId,
          postId,
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

  async deleteLike(userId: string, postId: string) {
    try {
      await this.txHost.tx.postLike.delete({
        where: {
          postId_userId: {
            postId,
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

  async createSave(userId: string, postId: string) {
    try {
      await this.txHost.tx.postSave.create({
        data: {
          userId,
          postId,
        },
        select: { userId: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return;
      }
      throw e;
    }
  }

  async deleteSave(userId: string, postId: string) {
    try {
      await this.txHost.tx.postSave.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
        select: { userId: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return;
      }
      throw e;
    }
  }

  async increaseViewCount(postId: string) {
    try {
      await this.txHost.tx.post.update({
        where: {
          id: postId,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
        select: { id: true },
      });
    } catch {
      return;
    }
  }

  async deleteOne(userId: string, postId: string) {
    try {
      return await this.txHost.tx.post.delete({
        where: {
          id: postId,
          authorId: userId,
        },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }
  }
}

type CreateInput = {
  userId: string;
  title: string;
  content: string;
  type: number;
  thumbnail: string | null;
};

type UpdateInput = {
  userId: string;
  postId: string;
  title: string;
  content: string;
  type: number;
  thumbnail: string | null;
};
