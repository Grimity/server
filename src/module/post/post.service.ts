import { Injectable, HttpException } from '@nestjs/common';
import { PostWriter } from './repository/post.writer';
import { postTypes, PostTypeEnum } from 'src/common/constants/post.constant';
import { convertPostType } from 'src/shared/util/convert-post-type';
import { PostReader } from './repository/post.reader';
import { removeHtml } from 'src/shared/util/remove-html';

function extractImage(htmlString: string): string | null {
  // 정규 표현식을 사용하여 첫 번째 <img> 태그의 src 속성을 추출
  const imgTagMatch = htmlString.match(/<img[^>]+src="([^">]+)"/);

  // img 태그가 있다면 src 값을 반환, 없다면 null 반환
  return imgTagMatch ? imgTagMatch[1] : null;
}

@Injectable()
export class PostService {
  constructor(
    private postWriter: PostWriter,
    private postReader: PostReader,
  ) {}

  async create(userId: string, { title, content, type }: CreateInput) {
    const parsedContent = removeHtml(content);

    if (parsedContent.length < 1) {
      throw new HttpException('내용을 입력해주세요', 400);
    }

    const thumbnail = extractImage(content);

    const typeNumber = PostTypeEnum[type];

    return await this.postWriter.create({
      userId,
      title,
      content,
      type: typeNumber,
      thumbnail,
    });
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

    const post = await this.postWriter.update({
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

    return;
  }

  async getNotices() {
    const posts = await this.postReader.findAllNotices();

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
      this.postReader.getPostCount(typeNumber),
      this.postReader.findMany({ type: typeNumber, page, size }),
    ]);

    return {
      totalCount,
      posts: posts.map((post) => {
        return {
          ...post,
          type: convertPostType(post.type),
          content: removeHtml(post.content).slice(0, 100),
        };
      }),
    };
  }

  async like(userId: string, postId: string) {
    const exists = await this.postReader.exists(postId);
    if (!exists) throw new HttpException('POST', 404);

    await this.postWriter.createLike(userId, postId);
    return;
  }

  async unlike(userId: string, postId: string) {
    await this.postWriter.deleteLike(userId, postId);
    return;
  }

  async save(userId: string, postId: string) {
    const exists = await this.postReader.exists(postId);
    if (!exists) throw new HttpException('POST', 404);

    await this.postWriter.createSave(userId, postId);
    return;
  }

  async unsave(userId: string, postId: string) {
    await this.postWriter.deleteSave(userId, postId);
    return;
  }

  async getPost(userId: string | null, postId: string) {
    const [post] = await Promise.all([
      this.postReader.findOneById(userId, postId),
      this.postWriter.increaseViewCount(postId),
    ]);

    if (!post) throw new HttpException('POST', 404);

    return {
      ...post,
      type: convertPostType(post.type),
    };
  }

  async deleteOne(userId: string, postId: string) {
    const post = await this.postWriter.deleteOne(userId, postId);
    if (!post) throw new HttpException('POST', 404);

    return;
  }

  async searchByAuthorName({ keyword, page, size }: SearchPostInput) {
    const user = await this.postReader.countByAuthorName(keyword);

    if (!user) {
      return {
        totalCount: 0,
        posts: [],
      };
    }

    const posts = await this.postReader.findManyByAuthor({
      authorId: user.id,
      page,
      size,
    });

    return {
      totalCount: user.postCount,
      posts: posts.map((post) => {
        return {
          ...post,
          type: convertPostType(post.type),
          content: removeHtml(post.content).slice(0, 100),
        };
      }),
    };
  }

  async searchByTitle({ keyword, page, size }: SearchPostInput) {
    const [totalCount, posts] = await Promise.all([
      this.postReader.countSearchResults(keyword),
      this.postReader.search({ keyword, page, size }),
    ]);

    return {
      totalCount,
      posts: posts.map((post) => {
        return {
          ...post,
          type: convertPostType(post.type),
          content: removeHtml(post.content).slice(0, 100),
        };
      }),
    };
  }

  async getMeta(id: string) {
    const post = await this.postReader.findMeta(id);
    if (!post) throw new HttpException('POST', 404);

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
