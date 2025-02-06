import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';

@Injectable()
export class PostRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateInput) {
    return await this.prisma.post.create({
      data: {
        authorId: input.userId,
        title: input.title,
        content: input.content,
        type: input.type,
        hasImage: input.hasImage,
      },
      select: {
        id: true,
      },
    });
  }

  async findAllNotices() {
    return await this.prisma.post.findMany({
      where: {
        type: 0,
      },
      select: {
        id: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

type CreateInput = {
  userId: string;
  title: string;
  content: string;
  type: number;
  hasImage: boolean;
};
