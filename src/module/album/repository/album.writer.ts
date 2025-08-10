import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { prismaUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class AlbumWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(
    userId: string,
    { name, order }: { name: string; order: number },
  ) {
    return await this.txHost.tx.album.create({
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
    return await this.txHost.tx.album.update({
      where: { id, userId },
      data: { name },
    });
  }

  async deleteOne(userId: string, id: string) {
    return await this.txHost.tx.album.delete({
      where: { id, userId },
    });
  }

  async updateOrder(userId: string, toUpdate: { id: string; order: number }[]) {
    await this.txHost.tx.$executeRaw`
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
    return;
  }
}
