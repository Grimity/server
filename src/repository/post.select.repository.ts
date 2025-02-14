import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from 'src/provider/redis.service';
import { kyselyUuid } from './util';

@Injectable()
export class PostSelectRepository {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAllNotices() {
    const result = await this.prisma.$kysely
      .selectFrom('Post')
      .where('type', '=', 0)
      .select([
        'Post.id',
        'title',
        'content',
        'hasImage',
        'commentCount',
        'viewCount',
        'Post.createdAt',
        'authorId',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select('name')
      .orderBy('Post.createdAt', 'desc')
      .execute();

    return result.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      hasImage: post.hasImage,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        name: post.name,
      },
    }));
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
    const [post] = await this.prisma.$kysely
      .selectFrom('Post')
      .where('Post.id', '=', kyselyUuid(postId))
      .select([
        'Post.id',
        'type',
        'title',
        'content',
        'hasImage',
        'commentCount',
        'viewCount',
        'Post.createdAt',
        'authorId',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select('name as authorName')
      .select((eb) =>
        eb
          .selectFrom('PostLike')
          .where('PostLike.postId', '=', kyselyUuid(postId))
          .select((eb) => eb.fn.count<bigint>('userId').as('likeCount'))
          .as('likeCount'),
      )
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('PostLike')
                .whereRef('PostLike.postId', '=', 'Post.id')
                .where('PostLike.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('PostSave')
                .whereRef('PostSave.postId', '=', 'Post.id')
                .where('PostSave.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isSave'),
        ]),
      )
      .execute();

    if (!post) throw new HttpException('POST', 404);

    return {
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      hasImage: post.hasImage,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      likeCount: post.likeCount === null ? 0 : Number(post.likeCount),
      isLike: post.isLike ?? false,
      isSave: post.isSave ?? false,
      author: {
        id: post.authorId,
        name: post.authorName,
      },
    };
  }

  async findTodayPopular() {
    return await this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
        },
      },
      take: 20,
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

  async findTodayPopularByIds(ids: string[]) {
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
        viewCount: 'desc',
      },
      take: 12,
    });
  }

  async getCachedTodayPopular() {
    const result = await this.redis.get('todayPopularPosts');

    if (result === null) return null;

    return JSON.parse(result) as string[];
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
