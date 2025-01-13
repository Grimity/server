import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';

@Injectable()
export class FeedRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.prisma.feed.create({
      data: {
        authorId: userId,
        title: createFeedInput.title,
        content: createFeedInput.content,
        isAI: createFeedInput.isAI,
        cards: createFeedInput.cards,
        tags: {
          createMany: {
            data: createFeedInput.tags.map((tag) => {
              return {
                tagName: tag,
              };
            }),
          },
        },
      },
      select: {
        id: true,
      },
    });
  }
}

type CreateFeedInput = {
  title: string;
  cards: string[];
  isAI: boolean;
  content: string;
  tags: string[];
};
