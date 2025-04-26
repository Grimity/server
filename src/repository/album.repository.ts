import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(userId: string) {
    return await this.prisma.album.findMany({
      where: {
        userId,
      },
    });
  }

  async create(
    userId: string,
    { name, order }: { name: string; order: number },
  ) {
    return await this.prisma.album.create({
      data: {
        userId,
        name,
        order,
      },
      select: {
        id: true,
      },
    });
  }

  async updateOne({
    userId,
    id,
    name,
  }: {
    userId: string;
    id: string;
    name: string;
  }) {
    return await this.prisma.album.update({
      where: { id, userId },
      data: { name },
    });
  }
}
