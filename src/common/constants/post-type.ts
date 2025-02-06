export const PostTypes = ['NORMAL', 'QUESTION', 'FEEDBACK', 'NOTICE'] as const;
export type PostType = (typeof PostTypes)[number];
