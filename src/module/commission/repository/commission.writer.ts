import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { CommissionQuestionType } from 'src/common/constants/commission.constant';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';

@Injectable()
export class CommissionWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(authorId: string, input: CreateCommissionInput) {
    return await this.txHost.tx.commission.create({
      data: {
        authorId,
        title: input.title,
        description: input.description,
        additionalCondition: input.additionalCondition ?? null,
        price: input.price,
        workDays: input.workDays,
        revisionCount: input.revisionCount,
        images: input.images,
        thumbnail: input.thumbnail,
        isPublic: input.isPublic,
        tags: {
          createMany: { data: input.tags.map((tagName) => ({ tagName })) },
        },
        questions: {
          createMany: {
            data: input.questions.map((q, idx) => ({
              order: idx,
              type: q.type,
              title: q.title,
              description: q.description ?? null,
              isRequired: q.isRequired,
              options: q.options,
            })),
          },
        },
      },
      select: { id: true },
    });
  }

  async update(
    authorId: string,
    commissionId: string,
    input: UpdateCommissionInput,
  ) {
    let updated: { id: string };
    try {
      updated = await this.txHost.tx.commission.update({
        where: { id: commissionId, authorId, deletedAt: null },
        data: {
          title: input.title,
          description: input.description,
          additionalCondition: input.additionalCondition ?? null,
          price: input.price,
          workDays: input.workDays,
          revisionCount: input.revisionCount,
          images: input.images,
          thumbnail: input.thumbnail,
          isPublic: input.isPublic,
        },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }

    await this.txHost.tx.commissionTag.deleteMany({ where: { commissionId } });
    await this.txHost.tx.commissionTag.createMany({
      data: input.tags.map((tagName) => ({ commissionId, tagName })),
    });

    await this.txHost.tx.commissionQuestion.deleteMany({
      where: { commissionId },
    });
    await this.txHost.tx.commissionQuestion.createMany({
      data: input.questions.map((q, idx) => ({
        commissionId,
        order: idx,
        type: q.type,
        title: q.title,
        description: q.description ?? null,
        isRequired: q.isRequired,
        options: q.options,
      })),
    });

    return updated;
  }

  async softDelete(authorId: string, commissionId: string) {
    try {
      return await this.txHost.tx.commission.update({
        where: { id: commissionId, authorId, deletedAt: null },
        data: { deletedAt: new Date() },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }
  }
}

export interface CreateCommissionInput {
  title: string;
  description: string;
  additionalCondition?: string | null;
  price: number;
  workDays: number;
  revisionCount: number;
  images: string[];
  thumbnail: string;
  isPublic: boolean;
  tags: string[];
  questions: Array<{
    type: CommissionQuestionType;
    title: string;
    description?: string | null;
    isRequired: boolean;
    options: string[];
  }>;
}

export type UpdateCommissionInput = CreateCommissionInput;
