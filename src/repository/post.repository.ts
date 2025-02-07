import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
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
        hasImage: input.hasImage,
      },
      select: {
        id: true,
      },
    });
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
      });
    } catch {
      return;
    }
  }
}

type CreateInput = {
  userId: string;
  title: string;
  content: string;
  type: number;
  hasImage: boolean;
};
