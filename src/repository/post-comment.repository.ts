import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostCommentRepository {
  constructor(private prisma: PrismaService) {}

  async createPostComment({
    userId,
    postId,
    parentCommentId,
    mentionedUserId,
    content,
  }: CreateInput) {
    try {
      await this.prisma.$transaction([
        this.prisma.postComment.create({
          data: {
            writerId: userId,
            postId,
            parentId: parentCommentId,
            mentionedUserId,
            content,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('POST', 404);
        }
      }
    }
  }
}

type CreateInput = {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
