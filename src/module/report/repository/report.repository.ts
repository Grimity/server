import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class ReportRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(input: CreateInput) {
    await this.txHost.tx.report.create({
      data: input,
      select: { id: true },
    });
    return;
  }
}

interface CreateInput {
  userId: string;
  type: number;
  refType: string;
  refId: string;
  content: string | null;
}
