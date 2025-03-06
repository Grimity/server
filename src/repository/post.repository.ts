import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateInput) {
    return await this.prisma.post.create({
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
      await this.prisma.post.update({
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
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('POST', 404);
        }
      }
      throw e;
    }
  }

  async createLike(userId: string, postId: string) {
    try {
      await this.prisma.postLike.create({
        data: {
          userId,
          postId,
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new HttpException('LIKE', 409);
        } else if (e.code === 'P2003') {
          throw new HttpException('POST', 404);
        }
      }
      throw e;
    }
  }

  async deleteLike(userId: string, postId: string) {
    try {
      await this.prisma.postLike.delete({
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
        if (e.code === 'P2025') {
          throw new HttpException('LIKE', 404);
        }
      }
      throw e;
    }
  }

  async createSave(userId: string, postId: string) {
    try {
      await this.prisma.postSave.create({
        data: {
          userId,
          postId,
        },
        select: { userId: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new HttpException('SAVE', 409);
        } else if (e.code === 'P2003') {
          throw new HttpException('POST', 404);
        }
      }
      throw e;
    }
  }

  async deleteSave(userId: string, postId: string) {
    try {
      await this.prisma.postSave.delete({
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
        if (e.code === 'P2025') {
          throw new HttpException('SAVE', 404);
        }
      }
      throw e;
    }
  }

  async increaseViewCount(postId: string) {
    try {
      await this.prisma.post.update({
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
      await this.prisma.post.delete({
        where: {
          id: postId,
          authorId: userId,
        },
        select: { id: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('POST', 404);
        }
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

type CachedPost = {
  createdAt: Date;
  id: string;
  title: string;
  content: string;
  type: number;
  hasImage: boolean;
  viewCount: number;
  commentCount: number;
  author: {
    id: string;
    name: string;
  };
};
