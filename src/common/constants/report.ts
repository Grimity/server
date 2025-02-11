export const refTypes = [
  'USER',
  'FEED',
  'FEED_COMMENT',
  'POST',
  'POST_COMMENT',
] as const;

export type RefType = (typeof refTypes)[number];
