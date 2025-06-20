import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class PostSelectRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async exists(postId: string) {
    const post = await this.txHost.tx.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    return post !== null;
  }

  async findAllNotices() {
    const result = await this.txHost.tx.$kysely
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
      .select(['name', 'url', 'User.image'])
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
        url: post.url,
        image: post.image,
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

    return await this.txHost.tx.post.count({
      where,
    });
  }

  async findMany({ type, page, size }: FindManyInput) {
    const result = await this.txHost.tx.$kysely
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
      .select(['name as authorName', 'url', 'User.image'])
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
        url: post.url,
        image: post.image,
      },
    }));
  }

  async findOneById(userId: string | null, postId: string) {
    const [post] = await this.txHost.tx.$kysely
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
      .select(['name as authorName', 'url', 'image'])
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

    if (!post) return null;

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
        url: post.url,
        image: post.image,
      },
    };
  }

  async countByAuthorName(name: string) {
    const [user] = await this.txHost.tx.$kysely
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
    const posts = await this.txHost.tx.$kysely
      .selectFrom('Post')
      .where('Post.authorId', '=', kyselyUuid(authorId))
      .select([
        'Post.id',
        'type',
        'title',
        'content',
        'thumbnail',
        'commentCount',
        'viewCount',
        'Post.createdAt',
      ])
      .innerJoin('User', 'User.id', 'Post.authorId')
      .select([
        'User.id as authorId',
        'User.name',
        'url',
        'User.image as image',
      ])
      .orderBy('Post.createdAt', 'desc')
      .offset((page - 1) * size)
      .limit(size)
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
        url: post.url,
        name: post.name,
        id: post.authorId,
        image: post.image,
      },
    }));
  }

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const feeds = await this.txHost.tx.$kysely
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
      .select(['name', 'url', 'User.image as image'])
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
        url: post.url,
        image: post.image,
      },
    }));
  }

  async findManyByUserId({ userId, page, size }: UserAndPageInput) {
    return await this.txHost.tx.post.findMany({
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
    return await this.txHost.tx.postSave.count({
      where: {
        userId,
      },
    });
  }

  async findManySavedPosts({ userId, page, size }: UserAndPageInput) {
    const posts = await this.txHost.tx.$kysely
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
      .select(['name as authorName', 'url', 'image'])
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
        url: post.url,
        image: post.image,
      },
    }));
  }

  async findAllIdsByUserId(userId: string) {
    const posts = await this.txHost.tx.post.findMany({
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
    return await this.txHost.tx.post.findUnique({
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
