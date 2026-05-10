import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class AdminPostWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async deleteOne(postId: string) {
    await this.txHost.tx.post.deleteMany({
      where: { id: postId },
    });
    return;
  }

  async create(input: {
    authorId: string;
    title: string;
    content: string;
    type: number;
    thumbnail: string | null;
  }) {
    return await this.txHost.tx.post.create({
      data: {
        authorId: input.authorId,
        title: input.title,
        content: input.content,
        type: input.type,
        thumbnail: input.thumbnail,
      },
      select: { id: true },
    });
  }

  async update(input: {
    postId: string;
    type: number;
    title: string;
    content: string;
    thumbnail: string | null;
  }) {
    try {
      return await this.txHost.tx.post.update({
        where: { id: input.postId, type: input.type },
        data: {
          title: input.title,
          content: input.content,
          thumbnail: input.thumbnail,
        },
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
