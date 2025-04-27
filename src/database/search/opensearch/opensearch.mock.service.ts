import { Injectable } from '@nestjs/common';
import { SearchService } from '../search.service';

@Injectable()
export class OpenSearchMockService implements SearchService {
  async insertUser() {
    return;
  }
  async updateUser() {
    return;
  }
  async insertFeed() {
    return;
  }
  async updateFeed() {
    return;
  }
  async deleteFeed() {
    return;
  }
  async deleteFeeds() {
    return;
  }
  async insertPost() {
    return;
  }
  async updatePost() {
    return;
  }
  async deletePost() {
    return;
  }
  async deleteAll() {
    return;
  }
  async searchUser() {
    return {
      totalCount: 0,
      ids: [] as string[],
    };
  }
  async searchFeed() {
    return {
      totalCount: 0,
      ids: [] as string[],
    };
  }
  async searchPost() {
    return {
      totalCount: 0,
      ids: [] as string[],
    };
  }
}
