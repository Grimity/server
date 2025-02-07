export const PostTypes = ['NORMAL', 'QUESTION', 'FEEDBACK', 'NOTICE'] as const;
export type PostType = (typeof PostTypes)[number];
export enum PostTypeEnum {
  NOTICE = 0,
  NORMAL = 1,
  QUESTION = 2,
  FEEDBACK = 3,
}

export const convertPostTypeFromNumber = (type: number): PostType => {
  switch (type) {
    case 0:
      return 'NOTICE';
    case 1:
      return 'NORMAL';
    case 2:
      return 'QUESTION';
    case 3:
      return 'FEEDBACK';
    default:
      return 'NORMAL';
  }
};
