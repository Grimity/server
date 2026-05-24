import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { CommissionQuestionType } from 'src/common/constants/commission.constant';

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
  tags: string[];
  questions: Array<{
    type: CommissionQuestionType;
    title: string;
    description?: string | null;
    isRequired: boolean;
    options: string[];
  }>;
}
