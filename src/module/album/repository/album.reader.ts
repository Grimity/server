import { Injectable } from '@nestjs/common';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class AlbumReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findManyByUserId(userId: string) {
    return await this.txHost.tx.album.findMany({
      where: {
        userId,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOneById(id: string) {
    return await this.txHost.tx.album.findUnique({
      where: { id },
    });
  }

  async findManyWithCountByUserId(userId: string) {
    const albums = await this.txHost.tx.$kysely
      .selectFrom('Album')
      .where('Album.userId', '=', kyselyUuid(userId))
      .select((eb) =>
        eb
          .selectFrom('Feed')
          .whereRef('Feed.albumId', '=', 'Album.id')
          .select((eb) => eb.fn.count<bigint>('Feed.id').as('feedCount'))
          .as('feedCount'),
      )
      .select(['Album.id', 'Album.name'])
      .orderBy('Album.order', 'asc')
      .execute();

    return albums.map((album) => ({
      id: album.id,
      name: album.name,
      feedCount: album.feedCount ? Number(album.feedCount) : 0,
    }));
  }
}
