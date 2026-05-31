import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

export interface CreateCommissionWorkInput {
  authorId: string;
  clientId: string;
  commissionId?: string | null;
  answers: PrismaJson.CommissionAnswer[];
  referenceImages: string[];
}

@Injectable()
export class CommissionWorkWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(input: CreateCommissionWorkInput) {
    const work = await this.txHost.tx.commissionWork.create({
      data: {
        authorId: input.authorId,
        clientId: input.clientId,
        commissionId: input.commissionId ?? null,
        status: 'PENDING',
      },
      select: { id: true },
    });

    await this.txHost.tx.commissionRequest.create({
      data: {
        workId: work.id,
        answers: input.answers,
        referenceImages: input.referenceImages,
      },
    });

    return work;
  }

  async reject(id: string, reason: string | null) {
    return this.txHost.tx.commissionWork.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason: reason,
        rejectedAt: new Date(),
      },
      select: { id: true },
    });
  }
}
