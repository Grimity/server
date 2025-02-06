import { Injectable, HttpException } from '@nestjs/common';
import { PostRepository } from 'src/repository/post.repository';
import { PostType } from 'src/common/constants';
import * as striptags from 'striptags';
import { PostTypeEnum } from 'src/common/constants';

@Injectable()
export class PostService {
  constructor(private postRepository: PostRepository) {}

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
    return await this.postRepository.findAllNotices();
  }
}

type CreateInput = {
  title: string;
  content: string;
  type: PostType;
};
