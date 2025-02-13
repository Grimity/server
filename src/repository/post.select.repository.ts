import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from 'src/provider/redis.service';

@Injectable()
export class PostSelectRepository {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAllNotices() {
    return await this.prisma.post.findMany({
      where: {
        type: 0,
      },
      select: {
        id: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPostCount(type: 2 | 3 | null) {
    const where: Prisma.PostWhereInput = {};
    if (type === null) {
      where.type = {
        not: 0,
      };
    } else where.type = type;

    return await this.prisma.post.count({
      where,
    });
  }

  async findMany({ type, page, size }: FindManyInput) {
    const where: Prisma.PostWhereInput = {};
    if (type === null) {
      where.type = {
        not: 0,
      };
    } else where.type = type;

    return await this.prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        type: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: (page - 1) * size,
      take: size,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneById(userId: string | null, postId: string) {
    const select: Prisma.PostSelect = {
      id: true,
      type: true,
      title: true,
      content: true,
      hasImage: true,
      commentCount: true,
      viewCount: true,
      createdAt: true,
      _count: {
        select: {
          likes: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    if (userId) {
      select.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };
      select.saves = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };
    }

    try {
      return await this.prisma.post.findUniqueOrThrow({
        where: {
          id: postId,
        },
        select,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('POST', 404);
        }
      }
      throw e;
    }
  }

  async findTodayPopular() {
    return await this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
        },
      },
      take: 12,
      orderBy: {
        viewCount: 'desc',
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getCachedTodayPopular() {
    const result = await this.redis.get('todayPopularPosts');

    if (result === null) return null;

    return JSON.parse(result) as ReturnType<
      typeof PostSelectRepository.prototype.findTodayPopular
    >;
  }

  async countByAuthorName(name: string) {
    return await this.prisma.user.findUnique({
      where: {
        name,
      },
      select: {
        id: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });
  }

  async findManyByAuthor({ authorId, page, size }: SearchByAuthorInput) {
    return await this.prisma.post.findMany({
      where: {
        authorId,
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * size,
      take: size,
    });
  }

  async findManyByIds(ids: string[]) {
    return await this.prisma.post.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findManyByUserId({ userId, page, size }: UserAndPageInput) {
    return await this.prisma.post.findMany({
      where: {
        authorId: userId,
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        hasImage: true,
        createdAt: true,
        commentCount: true,
        viewCount: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * size,
      take: size,
    });
  }

  async countSavedPosts(userId: string) {
    return await this.prisma.postSave.count({
      where: {
        userId,
      },
    });
  }

  async findManySavedPosts({ userId, page, size }: UserAndPageInput) {
    return await this.prisma.postSave.findMany({
      where: {
        userId,
      },
      select: {
        post: {
          select: {
            id: true,
            type: true,
            title: true,
            content: true,
            hasImage: true,
            commentCount: true,
            viewCount: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * size,
      take: size,
    });
  }
}

type FindManyInput = {
  type: 2 | 3 | null;
  page: number;
  size: number;
};

type SearchByAuthorInput = {
  authorId: string;
  size: number;
  page: number;
};

type UserAndPageInput = {
  userId: string;
  page: number;
  size: number;
};
