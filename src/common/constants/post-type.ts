export const PostTypes = ['NORMAL', 'QUESTION', 'FEEDBACK', 'NOTICE'] as const;
export type PostType = (typeof PostTypes)[number];
export enum PostTypeEnum {
  NOTICE = 0,
  NORMAL = 1,
  QUESTION = 2,
  FEEDBACK = 3,
}
