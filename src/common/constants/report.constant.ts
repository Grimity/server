export const refTypes = [
  'USER',
  'FEED',
  'FEED_COMMENT',
  'POST',
  'POST_COMMENT',
  'CHAT',
] as const;

// export type RefType = (typeof refTypes)[number];

export const reportTypes = [
  '사칭계정',
  '스팸/도배',
  '욕설/비방',
  '부적절한 프로필',
  '선정적인 컨텐츠',
  '기타',
] as const;
