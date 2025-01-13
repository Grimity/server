import { Injectable } from '@nestjs/common';
import { FeedRepository } from 'src/repository/feed.repository';

@Injectable()
export class FeedService {
  constructor(private feedRepository: FeedRepository) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.feedRepository.create(userId, createFeedInput);
  }
}

export type CreateFeedInput = {
  title: string;
  cards: string[];
  isAI: boolean;
  content: string;
  tags: string[];
};
