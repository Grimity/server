import { Injectable, HttpException } from '@nestjs/common';
import { PostRepository } from 'src/repository/post.repository';
import { PostType } from 'src/common/constants';
import * as striptags from 'striptags';
import { PostTypeEnum } from 'src/common/constants';
import { PostSelectRepository } from 'src/repository/post.select.repository';

@Injectable()
export class PostService {
  constructor(
    private postRepository: PostRepository,
    private postSelectRepository: PostSelectRepository,
  ) {}

  async create(userId: string, { title, content, type }: CreateInput) {
    const parsedContent = striptags(content);

    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const hasImage = content.includes('<img');

    const typeNumber = PostTypeEnum[type];

    return await this.postRepository.create({
      userId,
      title,
      content,
      type: typeNumber,
      hasImage,
    });
  }

  async getNotices() {
    const posts = await this.postSelectRepository.findAllNotices();

    return posts.map((post) => {
      return {
        ...post,
        type: 'NOTICE',
      };
    });
  }

  async getPosts({ type, page, size }: GetPostsInput) {
    const typeNumber = type === 'ALL' ? null : PostTypeEnum[type];

    let returnTotalCount: number | null = null;
    let returnPosts;

    if (page <= 1) {
      const [totalCount, posts] = await Promise.all([
        this.postSelectRepository.getPostCount(typeNumber),
        this.postSelectRepository.findMany({ type: typeNumber, page, size }),
      ]);

      returnTotalCount = totalCount;
      returnPosts = posts;
    } else {
      returnPosts = await this.postSelectRepository.findMany({
        type: typeNumber,
        page,
        size,
      });
    }

    return {
      totalCount: returnTotalCount,
      posts: returnPosts.map((post) => {
        let type: 'NORMAL' | 'QUESTION' | 'FEEDBACK';
        if (post.type === 1) {
          type = 'NORMAL';
        } else if (post.type === 2) {
          type = 'QUESTION';
        } else {
          type = 'FEEDBACK';
        }
        return {
          ...post,
          type,
        };
      }),
    };
  }

  async like(userId: string, postId: string) {
    await this.postRepository.createLike(userId, postId);
    return;
  }

  async unlike(userId: string, postId: string) {
    await this.postRepository.deleteLike(userId, postId);
    return;
  }
}

type CreateInput = {
  title: string;
  content: string;
  type: PostType;
};

type GetPostsInput = {
  type: 'ALL' | 'QUESTION' | 'FEEDBACK';
  page: number;
  size: number;
};
