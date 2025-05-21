export const postTypes = ['NORMAL', 'QUESTION', 'FEEDBACK', 'NOTICE'] as const;
export type PostType = (typeof postTypes)[number];
export enum PostTypeEnum {
  NOTICE = 0,
  NORMAL = 1,
  QUESTION = 2,
  FEEDBACK = 3,
}
