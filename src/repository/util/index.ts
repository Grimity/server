import { sql, RawBuilder } from 'kysely';

export function kyselyUuid(uuid: string): RawBuilder<string> {
  return sql`${uuid}::uuid`;
}
