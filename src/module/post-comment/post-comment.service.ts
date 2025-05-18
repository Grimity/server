import { Injectable, HttpException } from '@nestjs/common';
import { PostCommentRepository } from './repository/post-comment.repository';
import { AwsService } from '../aws/aws.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PostCommentService {
  constructor(
    private postCommentRepository: PostCommentRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(input: CreateInput) {
    const promiseMethods = [
      this.postCommentRepository.existsPost(input.postId),
    ];

    if (input.parentCommentId) {
      promiseMethods.push(
        this.postCommentRepository.existsComment(input.parentCommentId),
      );
    }
    const [postExists, commentExists] = await Promise.all(promiseMethods);
    if (!postExists) throw new HttpException('POST', 404);
    if (input.parentCommentId && !commentExists) {
      throw new HttpException('COMMENT', 404);
    }

    const comment = await this.postCommentRepository.create(input);

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

  async getComments(userId: string | null, postId: string) {
    const comments = await this.postCommentRepository.findManyByPostId(
      userId,
      postId,
    );

    return comments;
  }

  async like(userId: string, commentId: string) {
    const exists = await this.postCommentRepository.existsComment(commentId);
    if (!exists) throw new HttpException('COMMENT', 404);

    await this.postCommentRepository.createLike(userId, commentId);
    return;
  }

  async unlike(userId: string, commentId: string) {
    const exists = await this.postCommentRepository.existsComment(commentId);
    if (!exists) throw new HttpException('COMMENT', 404);

    await this.postCommentRepository.deleteLike(userId, commentId);
    return;
  }

  async deleteOne(userId: string, commentId: string) {
    const comment = await this.postCommentRepository.findOneById(commentId);
    if (!comment) throw new HttpException('COMMENT', 404);

    if (comment.parentId) {
      // 대댓글 삭제
      await this.postCommentRepository.deleteChild({
        userId,
        commentId,
        postId: comment.postId,
        parentId: comment.parentId,
      });
    } else {
      // 상위댓글 삭제
      await this.postCommentRepository.deleteParent({
        userId,
        commentId,
        postId: comment.postId,
      });
    }
    return;
  }
}

type CreateInput = {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
