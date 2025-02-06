import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostSelectRepository {
  constructor(private prisma: PrismaService) {}

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

  async getPostCount(type: 2 | 3 | null) {
    const where: Prisma.PostWhereInput = {};
    if (type === null) {
      where.type = {
        not: 0,
      };
    } else where.type = type;

    return await this.prisma.post.count({
      where,
    });
  }

  async findMany({ type, page, size }: FindManyInput) {
    const where: Prisma.PostWhereInput = {};
    if (type === null) {
      where.type = {
        not: 0,
      };
    } else where.type = type;

    return await this.prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        hasImage: true,
        commentCount: true,
        viewCount: true,
        type: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: (page - 1) * size,
      take: size,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

type FindManyInput = {
  type: 2 | 3 | null;
  page: number;
  size: number;
};
