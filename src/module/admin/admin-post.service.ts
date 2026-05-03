import { HttpException, Injectable } from '@nestjs/common';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { convertPostType } from 'src/shared/util/convert-post-type';
import { AdminPostReader } from './repository/admin-post.reader';
import { AdminPostWriter } from './repository/admin-post.writer';
import {
  AdminLatestPostsResponse,
  AdminPostDetailResponse,
} from './dto/admin-post.response';
import { GetPostsRequestTypes } from 'src/module/post/dto/post.request';

@Injectable()
export class AdminPostService {
  constructor(
    private readonly adminPostReader: AdminPostReader,
    private readonly adminPostWriter: AdminPostWriter,
  ) {}

  async getLatestPosts({
    cursor,
    size,
    type,
  }: {
    cursor: string | null;
    size: number;
    type: (typeof GetPostsRequestTypes)[number];
  }): Promise<AdminLatestPostsResponse> {
    const result = await this.adminPostReader.findManyLatest({
      cursor,
      size,
      type,
    });

    return {
      nextCursor: result.nextCursor,
      posts: result.posts.map((post) => ({
        id: post.id,
        type: convertPostType(post.type),
        title: post.title,
        thumbnail: getImageUrl(post.thumbnail),
        createdAt: post.createdAt,
        viewCount: post.viewCount,
        commentCount: post.commentCount,
        author: {
          ...post.author,
          image: getImageUrl(post.author.image),
        },
      })),
    };
  }

  async getPost(postId: string): Promise<AdminPostDetailResponse> {
    const post = await this.adminPostReader.getPostDetail(postId);
    if (!post) throw new HttpException('POST', 404);

    return {
      id: post.id,
      type: convertPostType(post.type),
      title: post.title,
      content: post.content,
      thumbnail: getImageUrl(post.thumbnail),
      createdAt: post.createdAt,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      author: {
        ...post.author,
        image: getImageUrl(post.author.image),
      },
    };
  }

  async deleteOne(postId: string) {
    const exists = await this.adminPostReader.exists(postId);
    if (!exists) throw new HttpException('POST', 404);

    await this.adminPostWriter.deleteOne(postId);
    return;
  }
}
