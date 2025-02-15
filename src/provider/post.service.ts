import { Injectable, HttpException } from '@nestjs/common';
import { PostRepository } from 'src/repository/post.repository';
import { PostType } from 'src/common/constants';
import * as striptags from 'striptags';
import { PostTypeEnum, convertPostTypeFromNumber } from 'src/common/constants';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { OpenSearchService } from './opensearch.service';

@Injectable()
export class PostService {
  constructor(
    private postRepository: PostRepository,
    private postSelectRepository: PostSelectRepository,
    private openSearchService: OpenSearchService,
  ) {}

  async create(userId: string, { title, content, type }: CreateInput) {
    const parsedContent = striptags(content).trim();

    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const hasImage = content.includes('<img');

    const typeNumber = PostTypeEnum[type];

    const { id } = await this.postRepository.create({
      userId,
      title,
      content,
      type: typeNumber,
      hasImage,
    });

    await this.openSearchService.insertPost({
      id,
      title,
      content: parsedContent,
    });
    return { id };
  }

  async update(
    userId: string,
    { postId, title, content, type }: CreateInput & { postId: string },
  ) {
    const parsedContent = striptags(content).trim();

    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const hasImage = content.includes('<img');

    const typeNumber = PostTypeEnum[type];

    await this.postRepository.update({
      userId,
      postId,
      title,
      content,
      type: typeNumber,
      hasImage,
    });

    await this.openSearchService.updatePost({
      id: postId,
      title,
      content: parsedContent,
    });
    return;
  }

  async getNotices() {
    const posts = await this.postSelectRepository.findAllNotices();

    return posts.map((post) => {
      return {
        ...post,
        type: 'NOTICE' as const,
      };
    });
  }

  async getPosts({ type, page, size }: GetPostsInput) {
    const typeNumber = type === 'ALL' ? null : PostTypeEnum[type];

    const [totalCount, posts] = await Promise.all([
      this.postSelectRepository.getPostCount(typeNumber),
      this.postSelectRepository.findMany({ type: typeNumber, page, size }),
    ]);

    return {
      totalCount,
      posts: posts.map((post) => {
        return {
          ...post,
          type: convertPostTypeFromNumber(post.type),
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

  async save(userId: string, postId: string) {
    await this.postRepository.createSave(userId, postId);
    return;
  }

  async unsave(userId: string, postId: string) {
    await this.postRepository.deleteSave(userId, postId);
    return;
  }

  async getPost(userId: string | null, postId: string) {
    const [post] = await Promise.all([
      this.postSelectRepository.findOneById(userId, postId),
      this.postRepository.increaseViewCount(postId),
    ]);

    return {
      ...post,
      type: convertPostTypeFromNumber(post.type),
    };
  }

  async deleteOne(userId: string, postId: string) {
    await this.postRepository.deleteOne(userId, postId);
    await this.openSearchService.deletePost(postId);
    return;
  }

  async getTodayPopularPosts() {
    let ids = await this.postSelectRepository.getCachedTodayPopular();
    if (ids === null) {
      ids = await this.postSelectRepository.findTodayPopularIds();
      await this.postRepository.cacheTodayPopular(ids);
    }

    const resultPosts =
      await this.postSelectRepository.findTodayPopularByIds(ids);

    return resultPosts.map((post) => {
      return {
        ...post,
        type: convertPostTypeFromNumber(post.type),
      };
    });
  }

  async searchByAuthorName({ keyword, page, size }: SearchPostInput) {
    const user = await this.postSelectRepository.countByAuthorName(keyword);

    if (!user) {
      return {
        totalCount: 0,
        posts: [],
      };
    }

    const posts = await this.postSelectRepository.findManyByAuthor({
      authorId: user.id,
      page,
      size,
    });

    return {
      totalCount: user.postCount,
      posts: posts.map((post) => {
        return {
          ...post,
          type: convertPostTypeFromNumber(post.type),
          author: {
            id: user.id,
            name: keyword,
          },
        };
      }),
    };
  }

  async searchByTitleAndContent({ keyword, page, size }: SearchPostInput) {
    const { totalCount, ids } = await this.openSearchService.searchPost({
      keyword,
      page,
      size,
    });

    const posts = await this.postSelectRepository.findManyByIds(ids);
    return {
      totalCount,
      posts: posts.map((post) => {
        return {
          ...post,
          type: convertPostTypeFromNumber(post.type),
        };
      }),
    };
  }
}

type CreateInput = {
  title: string;
  content: string;
  type: Exclude<PostType, 'NOTICE'>;
};

type GetPostsInput = {
  type: 'ALL' | 'QUESTION' | 'FEEDBACK';
  page: number;
  size: number;
};

type SearchPostInput = {
  keyword: string;
  page: number;
  size: number;
};
