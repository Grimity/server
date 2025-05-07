import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely';
import kyselyExtension from 'prisma-extension-kysely';
import { DB } from 'src/database/kysely/types';

declare module '@prisma/client' {
  interface PrismaClient {
    $kysely: Kysely<DB>;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  >
  implements OnModuleInit
{
  constructor() {
    super({
      // log: process.env.NODE_ENV === 'production' ? ['info'] : [],
      // log: ['query', 'warn'],
      log: [
        {
          emit: 'event',
          level: 'query',
        },
      ],
    });

    this.$on('query', (e) => {
      if (e.duration > 500) {
        console.log('Query: ', e.query);
        console.log('Duration: ', e.duration);
        console.log('Params: ', e.params);
        console.log('Target: ', e.target);
      }
    });
  }
  async onModuleInit() {
    const extension = this.$extends(
      kyselyExtension({
        kysely: (driver) =>
          new Kysely<DB>({
            dialect: {
              createDriver: () => driver,
              createAdapter: () => new PostgresAdapter(),
              createIntrospector: (db) => new PostgresIntrospector(db),
              createQueryCompiler: () => new PostgresQueryCompiler(),
            },
          }),
      }),
    );
    this.$kysely = extension.$kysely;

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
