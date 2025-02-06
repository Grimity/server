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
}

type CreateInput = {
  userId: string;
  title: string;
  content: string;
  type: number;
  hasImage: boolean;
};
