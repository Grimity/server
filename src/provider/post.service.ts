import { Injectable, HttpException, Inject } from '@nestjs/common';
import { PostRepository } from 'src/repository/post.repository';
import { postTypes } from 'src/common/constants';
import { PostTypeEnum, convertPostTypeFromNumber } from 'src/common/constants';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { SearchService } from 'src/database/search/search.service';
import { extractImage } from './util';
import { RedisService } from 'src/database/redis/redis.service';
import { removeHtml } from './util/remove-html';

@Injectable()
export class PostService {
  constructor(
    private postRepository: PostRepository,
    private postSelectRepository: PostSelectRepository,
    private redisService: RedisService,
    @Inject(SearchService) private searchService: SearchService,
  ) {}

  async create(userId: string, { title, content, type }: CreateInput) {
    const parsedContent = removeHtml(content);

    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const thumbnail = extractImage(content);

    const typeNumber = PostTypeEnum[type];

    const { id } = await this.postRepository.create({
      userId,
      title,
      content,
      type: typeNumber,
      thumbnail,
    });

    await this.searchService.insertPost({
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
    const parsedContent = removeHtml(content);

    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const thumbnail = extractImage(content);

    const typeNumber = PostTypeEnum[type];

    const post = await this.postRepository.update({
      userId,
      postId,
      title,
      content,
      type: typeNumber,
      thumbnail,
    });

    if (!post) {
      throw new HttpException('POST', 404);
    }

    await this.searchService.updatePost({
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
        content: removeHtml(post.content).slice(0, 100),
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
          content: removeHtml(post.content).slice(0, 100),
        };
      }),
    };
  }

  async like(userId: string, postId: string) {
    const exists = await this.postSelectRepository.exists(postId);
    if (!exists) throw new HttpException('POST', 404);

    await this.postRepository.createLike(userId, postId);
    return;
  }

  async unlike(userId: string, postId: string) {
    await this.postRepository.deleteLike(userId, postId);
    return;
  }

  async save(userId: string, postId: string) {
    const exists = await this.postSelectRepository.exists(postId);
    if (!exists) throw new HttpException('POST', 404);

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
    const post = await this.postRepository.deleteOne(userId, postId);
    if (!post) throw new HttpException('POST', 404);

    await this.searchService.deletePost(postId);
    return;
  }

  async getTodayPopularPosts() {
    let ids = (await this.redisService.getArray('todayPopularPostIds')) as
      | string[]
      | null;

    if (ids === null) {
      ids = await this.postSelectRepository.findTodayPopularIds();
      await this.redisService.cacheArray('todayPopularPostIds', ids, 60 * 30);
    }

    const resultPosts =
      await this.postSelectRepository.findTodayPopularByIds(ids);

    return resultPosts.map((post) => {
      return {
        ...post,
        type: convertPostTypeFromNumber(post.type),
        content: removeHtml(post.content).slice(0, 100),
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
          content: removeHtml(post.content).slice(0, 100),
        };
      }),
    };
  }

  async searchByTitleAndContent({ keyword, page, size }: SearchPostInput) {
    const { totalCount, ids } = await this.searchService.searchPost({
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
          content: removeHtml(post.content).slice(0, 100),
        };
      }),
    };
  }

  async getMeta(id: string) {
    const post = await this.postSelectRepository.findMeta(id);

    const parsedContent = removeHtml(post.content).slice(0, 100);
    const cleanedText = parsedContent.replace(/&nbsp;|&amp;/g, ' ');

    return {
      id: post.id,
      title: post.title,
      content: cleanedText.slice(0, 100),
      thumbnail: post.thumbnail,
      createdAt: post.createdAt,
    };
  }
}

type CreateInput = {
  title: string;
  content: string;
  type: (typeof postTypes)[number];
};

type GetPostsInput = {
  type: (typeof postTypes)[number] | 'ALL';
  page: number;
  size: number;
};

type SearchPostInput = {
  keyword: string;
  page: number;
  size: number;
};
