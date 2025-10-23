import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class PushRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findManyByUserId(userId: string) {
    return await this.txHost.tx.pushToken.findMany({
      where: {
        userId,
      },
      select: {
        token: true,
      },
    });
  }
}
