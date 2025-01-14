import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedCommentRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    try {
      await this.prisma.feedComment.create({
        data: {
          writerId: userId,
          feedId: input.feedId,
          parentId: input.parentCommentId ?? null,
          content: input.comment,
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }
}

type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  comment: string;
};
