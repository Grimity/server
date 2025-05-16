import { sql, RawBuilder } from 'kysely';
import { Prisma } from '@prisma/client';

export function kyselyUuid(uuid: string): RawBuilder<string> {
  return sql`${uuid}::uuid`;
}

export function prismaUuid(uuid: string) {
  return Prisma.sql`${uuid}::uuid`;
}
