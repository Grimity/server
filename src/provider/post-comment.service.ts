import { Injectable } from '@nestjs/common';
import { PostCommentRepository } from 'src/repository/post-comment.repository';
import { AwsService } from './aws.service';

@Injectable()
export class PostCommentService {
  constructor(
    private postCommentRepository: PostCommentRepository,
    private awsService: AwsService,
  ) {}

  async create(input: CreateInput) {
    const comment = await this.postCommentRepository.create(input);

    if (input.mentionedUserId && input.parentCommentId) {
      await this.awsService.pushEvent({
        type: 'POST_MENTION',
        actorId: input.userId,
        postId: input.postId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      await this.awsService.pushEvent({
        type: 'POST_REPLY',
        actorId: input.userId,
        postId: input.postId,
        parentId: input.parentCommentId,
      });
    } else {
      await this.awsService.pushEvent({
        type: 'POST_COMMENT',
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

    return comments.map((comment) => {
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        likeCount: comment.likeCount,
        isDeleted: comment.isDeleted,
        writer: comment.writer,
        isLike: comment.isLike,
        childComments: comment.childComments.map((child) => {
          return {
            id: child.id,
            content: child.content,
            createdAt: child.createdAt,
            likeCount: child.likeCount,
            writer: child.writer,
            mentionedUser: child.mentionedUser,
            isLike: child.isLike,
          };
        }),
      };
    });
  }

  async like(userId: string, commentId: string) {
    await this.postCommentRepository.createLike(userId, commentId);
    return;
  }

  async unlike(userId: string, commentId: string) {
    await this.postCommentRepository.deleteLike(userId, commentId);
    return;
  }

  async deleteOne(userId: string, commentId: string) {
    const comment = await this.postCommentRepository.findOneById(commentId);

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
