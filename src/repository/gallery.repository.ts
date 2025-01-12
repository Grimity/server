import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';

@Injectable()
export class GalleryRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createGalleryInput: CreateGalleryInput) {
    return await this.prisma.gallery.create({
      data: {
        authorId: userId,
        title: createGalleryInput.title,
        content: createGalleryInput.content,
        isAI: createGalleryInput.isAI,
        images: createGalleryInput.images,
        tags: {
          createMany: {
            data: createGalleryInput.tags.map((tag) => {
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

type CreateGalleryInput = {
  title: string;
  images: string[];
  isAI: boolean;
  content: string;
  tags: string[];
};
