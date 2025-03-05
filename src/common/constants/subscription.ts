export const subscriptionTypes = [
  'FOLLOW',
  'FEED_LIKE',
  'FEED_COMMENT',
  'FEED_REPLY',
  'POST_COMMENT',
  'POST_REPLY',
] as const;

export type SubscriptionType = (typeof subscriptionTypes)[number];
