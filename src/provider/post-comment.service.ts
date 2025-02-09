import { Injectable } from '@nestjs/common';
import { PostCommentRepository } from 'src/repository/post-comment.repository';

@Injectable()
export class PostCommentService {
  constructor(private postCommentRepository: PostCommentRepository) {}

  async create(input: CreateInput) {
    await this.postCommentRepository.create(input);
    return;
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
        isLike: comment.likes?.length === 1,
        childComments: comment.childComments.map((child: any) => {
          return {
            id: child.id,
            content: child.content,
            createdAt: child.createdAt,
            likeCount: child.likeCount,
            writer: child.writer,
            mentionedUser: child.mentionedUser,
            isLike: child.likes?.length === 1,
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
