import { Injectable } from '@nestjs/common';
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
}
