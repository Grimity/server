import { PostType } from 'src/common/constants/post.constant';

export const convertPostType = (type: number): PostType => {
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
