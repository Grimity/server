import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class CommissionWorkReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findUserById(userId: string) {
    return this.txHost.tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  async findWorkById(id: string) {
    return this.txHost.tx.commissionWork.findUnique({
      where: { id },
      select: { id: true, authorId: true, clientId: true, status: true },
    });
  }

  async findReview(workId: string, reviewerId: string) {
    return this.txHost.tx.commissionReview.findUnique({
      where: { workId_reviewerId: { workId, reviewerId } },
      select: { id: true },
    });
  }

  async findCommissionWithQuestions(commissionId: string) {
    return this.txHost.tx.commission.findFirst({
      where: { id: commissionId, deletedAt: null, isPublic: true },
      select: {
        id: true,
        authorId: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            type: true,
            title: true,
            description: true,
            isRequired: true,
            options: true,
          },
        },
      },
    });
  }
}
