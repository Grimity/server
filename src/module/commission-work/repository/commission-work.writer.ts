import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { CommissionReviewRating, CommissionWorkEventType } from '@prisma/client';

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

  async upsertResult(
    workId: string,
    images: string[],
    isFinal: boolean,
    status: 'IN_PROGRESS' | 'FINAL',
  ) {
    await this.txHost.tx.commissionWorkResult.upsert({
      where: { workId },
      create: { workId, images, isFinal },
      update: { images, isFinal },
    });

    return this.txHost.tx.commissionWork.update({
      where: { id: workId },
      data: { status },
      select: { id: true },
    });
  }

  async accept(id: string) {
    return this.txHost.tx.commissionWork.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      select: { id: true },
    });
  }

  async complete(id: string) {
    return this.txHost.tx.commissionWork.update({
      where: { id },
      data: { status: 'COMPLETED' },
      select: { id: true },
    });
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

  async createMemo(workId: string, content: string) {
    return this.txHost.tx.commissionWorkMemo.create({
      data: { workId, content },
      select: { id: true },
    });
  }

  async createEvent(workId: string, type: CommissionWorkEventType) {
    return this.txHost.tx.commissionWorkEvent.create({
      data: { workId, type },
    });
  }

  async createReview(input: {
    workId: string;
    reviewerId: string;
    revieweeId: string;
    rating: CommissionReviewRating;
    content: string | null;
  }) {
    return this.txHost.tx.commissionReview.create({
      data: input,
      select: { id: true },
    });
  }
}
