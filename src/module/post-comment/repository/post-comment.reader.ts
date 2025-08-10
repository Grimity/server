import { Injectable } from '@nestjs/common';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class PostCommentReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async existsPost(postId: string) {
    const post = await this.txHost.tx.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    return !!post;
  }

  async existsComment(commentId: string) {
    const comment = await this.txHost.tx.postComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    return !!comment;
  }

  async findManyByPostId(userId: string | null, postId: string) {
    const result = await this.txHost.tx.$kysely
      .selectFrom('PostComment')
      .where('PostComment.postId', '=', kyselyUuid(postId))
      .select([
        'PostComment.id',
        'PostComment.writerId',
        'PostComment.parentId',
        'PostComment.content',
        'PostComment.mentionedUserId',
        'PostComment.createdAt',
        'PostComment.likeCount',
        'PostComment.isDeleted',
      ])
      .leftJoin('User as w', 'w.id', 'PostComment.writerId')
      .select([
        'w.name as writerName',
        'w.url as writerUrl',
        'w.image as writerImage',
      ])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('PostCommentLike')
                .whereRef(
                  'PostCommentLike.postCommentId',
                  '=',
                  'PostComment.id',
                )
                .where('PostCommentLike.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .leftJoin('User as m', 'm.id', 'PostComment.mentionedUserId')
      .select([
        'm.name as mentionedUserName',
        'm.url as mentionedUserUrl',
        'm.image as mentionedUserImage',
      ])
      .orderBy('PostComment.createdAt', 'asc')
      .execute();

    const comments: {
      id: string;
      content: string;
      createdAt: Date;
      likeCount: number;
      isDeleted: boolean;
      writer: {
        id: string;
        name: string;
        url: string;
        image: string | null;
      } | null;
      isLike: boolean;
      childComments: {
        id: string;
        content: string;
        createdAt: Date;
        likeCount: number;
        writer: {
          id: string;
          name: string;
          url: string;
          image: string | null;
        } | null;
        mentionedUser: {
          id: string;
          name: string;
          url: string;
          image: string | null;
        } | null;
        isLike: boolean;
      }[];
    }[] = [];

    const parentRecord = new Map<string, number>();

    for (const comment of result) {
      if (comment.parentId === null) {
        comments.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          isDeleted: comment.isDeleted,
          writer:
            comment.writerId && comment.writerName
              ? {
                  id: comment.writerId,
                  name: comment.writerName,
                  url: comment.writerUrl!,
                  image: comment.writerImage,
                }
              : null,
          isLike: comment.isLike ?? false,
          childComments: [],
        });
        parentRecord.set(comment.id, comments.length - 1);
      } else {
        comments[parentRecord.get(comment.parentId)!].childComments.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          writer:
            comment.writerId && comment.writerName
              ? {
                  id: comment.writerId,
                  name: comment.writerName,
                  url: comment.writerUrl!,
                  image: comment.writerImage,
                }
              : null,
          isLike: comment.isLike ?? false,
          mentionedUser:
            comment.mentionedUserId && comment.mentionedUserName
              ? {
                  id: comment.mentionedUserId,
                  name: comment.mentionedUserName,
                  url: comment.mentionedUserUrl!,
                  image: comment.mentionedUserImage,
                }
              : null,
        });
      }
    }

    return comments;
  }

  async findOneById(commentId: string) {
    return await this.txHost.tx.postComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        parentId: true,
        postId: true,
        writerId: true,
        isDeleted: true,
      },
    });
  }

  async countChildComments(postId: string, parentId: string) {
    return await this.txHost.tx.postComment.count({
      where: {
        postId,
        parentId,
      },
    });
  }
}
