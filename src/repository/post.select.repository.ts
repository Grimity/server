import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from './util';

@Injectable()
export class PostSelectRepository {
  constructor(private prisma: PrismaService) {}

  async findAllNotices() {
    const result = await this.prisma.$kysely
      .selectFrom('Post')
      .where('type', '=', 0)
      .select([
        'Post.id',
        'title',
        'content',
        'thumbnail',
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
      thumbnail: post.thumbnail,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        name: post.name,
      },
    }));
  }

  async getPostCount(type: number | null) {
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
    const result = await this.prisma.$kysely
      .selectFrom('Post')
      .where((eb) => {
        if (type === null) return eb('type', '!=', 0);
        return eb('type', '=', type);
      })
      .select([
        'Post.id',
        'title',
        'content',
        'thumbnail',
        'commentCount',
        'viewCount',
        'type',
        'Post.createdAt',
        'authorId',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select('name as authorName')
      .orderBy('Post.createdAt', 'desc')
      .limit(size)
      .offset((page - 1) * size)
      .execute();

    return result.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      type: post.type,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        name: post.authorName,
      },
    }));
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
        'thumbnail',
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
      thumbnail: post.thumbnail,
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

  async findTodayPopularIds() {
    const posts = await this.prisma.post.findMany({
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
      },
    });
    return posts.map((post) => post.id);
  }

  async findTodayPopularByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const result = await this.prisma.$kysely
      .selectFrom('Post')
      .where(
        'Post.id',
        'in',
        ids.map((id) => kyselyUuid(id)),
      )
      .select([
        'Post.id',
        'type',
        'title',
        'content',
        'thumbnail',
        'commentCount',
        'viewCount',
        'Post.createdAt',
        'authorId',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select('name as authorName')
      .orderBy('Post.viewCount', 'desc')
      .limit(12)
      .execute();

    return result.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        name: post.authorName,
      },
    }));
  }

  async countByAuthorName(name: string) {
    const [user] = await this.prisma.$kysely
      .selectFrom('User')
      .where('name', '=', name)
      .select('User.id')
      .select((eb) =>
        eb
          .selectFrom('Post')
          .whereRef('authorId', '=', 'User.id')
          .select(eb.fn.count<bigint>('id').as('posts'))
          .as('postCount'),
      )
      .execute();

    if (!user) return null;

    return {
      id: user.id,
      postCount: user.postCount === null ? 0 : Number(user.postCount),
    };
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
        thumbnail: true,
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
    if (ids.length === 0) return [];
    const feeds = await this.prisma.$kysely
      .selectFrom('Post')
      .where('Post.id', 'in', ids.map(kyselyUuid))
      .select([
        'Post.id',
        'type',
        'title',
        'content',
        'thumbnail',
        'commentCount',
        'viewCount',
        'Post.createdAt',
        'authorId',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select('name')
      .orderBy('Post.createdAt', 'desc')
      .execute();

    return feeds.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        name: post.name,
      },
    }));
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
        thumbnail: true,
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
    const posts = await this.prisma.$kysely
      .selectFrom('PostSave')
      .where('PostSave.userId', '=', kyselyUuid(userId))
      .innerJoin('Post', 'Post.id', 'PostSave.postId')
      .select([
        'Post.id',
        'type',
        'title',
        'content',
        'thumbnail',
        'commentCount',
        'viewCount',
        'Post.createdAt',
        'authorId',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select('name as authorName')
      .orderBy('PostSave.createdAt', 'desc')
      .limit(size)
      .offset((page - 1) * size)
      .execute();

    return posts.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        name: post.authorName,
      },
    }));
  }

  async findAllIdsByUserId(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
      },
      select: {
        id: true,
      },
    });
    return posts.map((post) => post.id);
  }

  async findMeta(id: string) {
    try {
      return await this.prisma.post.findUniqueOrThrow({
        where: {
          id,
        },
        select: {
          id: true,
          title: true,
          content: true,
          thumbnail: true,
          createdAt: true,
        },
      });
    } catch (e) {
      throw new HttpException('POST', 404);
    }
  }
}

type FindManyInput = {
  type: number | null;
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
