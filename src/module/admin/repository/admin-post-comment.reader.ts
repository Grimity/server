import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { AdminParentPostCommentResponse } from '../dto/admin-post-comment.response';

@Injectable()
export class AdminPostCommentReader {
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

  async findManyByPostId(
    postId: string,
  ): Promise<AdminParentPostCommentResponse[]> {
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
      .leftJoin('User as m', 'm.id', 'PostComment.mentionedUserId')
      .select([
        'm.name as mentionedUserName',
        'm.url as mentionedUserUrl',
        'm.image as mentionedUserImage',
      ])
      .orderBy('PostComment.createdAt', 'asc')
      .execute();

    const comments: AdminParentPostCommentResponse[] = [];
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
          childComments: [],
        });
        parentRecord.set(comment.id, comments.length - 1);
      } else {
        const parentIndex = parentRecord.get(comment.parentId);
        if (parentIndex === undefined) continue;
        comments[parentIndex].childComments.push({
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
}
