import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { prismaUuid } from './util';

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

  async deleteOne(userId: string, id: string) {
    return await this.prisma.album.delete({
      where: { id, userId },
    });
  }

  async updateOrder(userId: string, toUpdate: { id: string; order: number }[]) {
    await this.prisma.$executeRaw`
      UPDATE "Album"
      SET "order" = CASE
        ${Prisma.join(
          toUpdate.map((item) => {
            return Prisma.sql`WHEN id = ${prismaUuid(item.id)} THEN ${item.order}`;
          }),
          ' ',
        )}
        END
      WHERE id IN (${Prisma.join(toUpdate.map((item) => prismaUuid(item.id)))})
      AND "userId" = ${prismaUuid(userId)}
    `;
  }
}
