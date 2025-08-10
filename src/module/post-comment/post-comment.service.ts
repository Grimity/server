import { Injectable, HttpException } from '@nestjs/common';
import { PostCommentReader } from './repository/post-comment.reader';
import { PostCommentWriter } from './repository/post-comment.writer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class PostCommentService {
  constructor(
    private readonly postCommentReader: PostCommentReader,
    private readonly postCommentWriter: PostCommentWriter,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(input: CreateInput) {
    const promiseMethods = [this.postCommentReader.existsPost(input.postId)];

    if (input.parentCommentId) {
      promiseMethods.push(
        this.postCommentReader.existsComment(input.parentCommentId),
      );
    }
    const [postExists, commentExists] = await Promise.all(promiseMethods);
    if (!postExists) throw new HttpException('POST', 404);
    if (input.parentCommentId && !commentExists) {
      throw new HttpException('COMMENT', 404);
    }

    const comment = await this.createTransaction(input);

    if (input.mentionedUserId && input.parentCommentId) {
      this.eventEmitter.emit('notification.POST_MENTION', {
        actorId: input.userId,
        postId: input.postId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      this.eventEmitter.emit('notification.POST_REPLY', {
        actorId: input.userId,
        postId: input.postId,
        parentId: input.parentCommentId,
      });
    } else {
      this.eventEmitter.emit('notification.POST_COMMENT', {
        actorId: input.userId,
        postId: input.postId,
      });
    }
    return comment;
  }

  @Transactional()
  async createTransaction(input: CreateInput) {
    const [post] = await Promise.all([
      this.postCommentWriter.create(input),
      this.postCommentWriter.increaseCommentCount(input.postId),
    ]);
    return post;
  }

  async getComments(userId: string | null, postId: string) {
    const comments = await this.postCommentReader.findManyByPostId(
      userId,
      postId,
    );

    return comments;
  }

  async like(userId: string, commentId: string) {
    const exists = await this.postCommentReader.existsComment(commentId);
    if (!exists) throw new HttpException('COMMENT', 404);

    await this.likeTransaction(userId, commentId);
    return;
  }

  @Transactional()
  async likeTransaction(userId: string, commentId: string) {
    await Promise.all([
      this.postCommentWriter.createLike(userId, commentId),
      this.postCommentWriter.increaseLikeCount(commentId),
    ]);
    return;
  }

  async unlike(userId: string, commentId: string) {
    const exists = await this.postCommentReader.existsComment(commentId);
    if (!exists) throw new HttpException('COMMENT', 404);

    await this.unlikeTransaction(userId, commentId);
    return;
  }

  @Transactional()
  async unlikeTransaction(userId: string, commentId: string) {
    await Promise.all([
      this.postCommentWriter.deleteLike(userId, commentId),
      this.postCommentWriter.decreaseLikeCount(commentId),
    ]);
    return;
  }

  async deleteOne(userId: string, commentId: string) {
    const comment = await this.postCommentReader.findOneById(commentId);

    if (!comment) throw new HttpException('COMMENT', 404);
    if (comment.writerId !== userId)
      throw new HttpException('UNAUTHORIZED', 403);

    if (comment.parentId) {
      // 대댓글 삭제
      await this.deleteChildTransaction({
        parentId: comment.parentId,
        commentId: comment.id,
        postId: comment.postId,
      });
    } else {
      // 상위댓글 삭제
      await this.deleteParentTransaction({
        commentId: comment.id,
        postId: comment.postId,
      });
    }
    return;
  }

  @Transactional()
  async deleteParentTransaction(input: { commentId: string; postId: string }) {
    const { commentId, postId } = input;
    const count = await this.postCommentReader.countChildComments(
      postId,
      commentId,
    );
    if (count === 0) {
      await Promise.all([
        this.postCommentWriter.deleteOne(commentId),
        this.postCommentWriter.decreaseCommentCount(postId),
      ]);
    } else {
      await Promise.all([
        this.postCommentWriter.updateOne(commentId, {
          isDeleted: true,
          content: '',
          writerId: null,
        }),
        this.postCommentWriter.decreaseCommentCount(postId),
      ]);
    }
  }

  @Transactional()
  async deleteChildTransaction(input: {
    parentId: string;
    commentId: string;
    postId: string;
  }) {
    const { parentId, commentId, postId } = input;
    const parentComment = await this.postCommentReader.findOneById(parentId);
    const count = await this.postCommentReader.countChildComments(
      postId,
      parentId,
    );

    if (!parentComment) throw new HttpException('COMMENT', 404);
    if (parentComment.isDeleted && count === 1) {
      await Promise.all([
        this.postCommentWriter.deleteOne(commentId),
        this.postCommentWriter.decreaseCommentCount(postId),
        this.postCommentWriter.deleteOne(parentComment.id),
      ]);
    } else {
      await Promise.all([
        this.postCommentWriter.deleteOne(commentId),
        this.postCommentWriter.decreaseCommentCount(postId),
      ]);
    }
  }
}

interface CreateInput {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
}
