import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { PostTypeEnum } from 'src/common/constants/post.constant';
import { GetPostsRequestTypes } from 'src/module/post/dto/post.request';

@Injectable()
export class AdminPostReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async exists(postId: string) {
    const post = await this.txHost.tx.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    return !!post;
  }

  async findManyLatest({
    cursor,
    size,
    type,
  }: {
    cursor: string | null;
    size: number;
    type: (typeof GetPostsRequestTypes)[number];
  }) {
    let query = this.txHost.tx.$kysely
      .selectFrom('Post')
      .innerJoin('User', 'Post.authorId', 'User.id')
      .select([
        'Post.id as id',
        'Post.type as type',
        'Post.title as title',
        'Post.thumbnail as thumbnail',
        'Post.createdAt as createdAt',
        'Post.viewCount as viewCount',
        'Post.commentCount as commentCount',
        'User.id as authorId',
        'User.name as authorName',
        'User.url as authorUrl',
        'User.image as authorImage',
      ])
      .orderBy('Post.createdAt', 'desc')
      .orderBy('Post.id', 'desc')
      .limit(size);

    if (type !== 'ALL') {
      query = query.where('Post.type', '=', PostTypeEnum[type]);
    }

    if (cursor) {
      const [iso, id] = cursor.split('_');
      if (!iso || !id) {
        return { nextCursor: null, posts: [] };
      }
      const lastCreatedAt = new Date(iso);
      query = query.where((eb) =>
        eb.or([
          eb('Post.createdAt', '<', lastCreatedAt),
          eb.and([
            eb('Post.createdAt', '=', lastCreatedAt),
            eb('Post.id', '<', kyselyUuid(id)),
          ]),
        ]),
      );
    }

    const rows = await query.execute();

    return {
      nextCursor:
        rows.length === size
          ? `${rows[size - 1].createdAt.toISOString()}_${rows[size - 1].id}`
          : null,
      posts: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        thumbnail: row.thumbnail,
        createdAt: row.createdAt,
        viewCount: row.viewCount,
        commentCount: row.commentCount,
        author: {
          id: row.authorId,
          name: row.authorName,
          url: row.authorUrl,
          image: row.authorImage,
        },
      })),
    };
  }

  async getPostDetail(postId: string) {
    const [post] = await this.txHost.tx.$kysely
      .selectFrom('Post')
      .where('Post.id', '=', kyselyUuid(postId))
      .innerJoin('User as Author', 'Post.authorId', 'Author.id')
      .select([
        'Post.id as id',
        'Post.type as type',
        'Post.title as title',
        'Post.content as content',
        'Post.thumbnail as thumbnail',
        'Post.createdAt as createdAt',
        'Post.viewCount as viewCount',
        'Post.commentCount as commentCount',
        'Author.id as authorId',
        'Author.name as authorName',
        'Author.url as authorUrl',
        'Author.image as authorImage',
      ])
      .select((eb) =>
        eb
          .selectFrom('PostLike')
          .whereRef('PostLike.postId', '=', 'Post.id')
          .select((eb) => eb.fn.count<bigint>('PostLike.userId').as('cnt'))
          .as('likeCount'),
      )
      .execute();

    if (!post) return null;

    return {
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      createdAt: post.createdAt,
      viewCount: post.viewCount,
      commentCount: post.commentCount,
      likeCount: post.likeCount === null ? 0 : Number(post.likeCount),
      author: {
        id: post.authorId,
        name: post.authorName,
        url: post.authorUrl,
        image: post.authorImage,
      },
    };
  }
}
