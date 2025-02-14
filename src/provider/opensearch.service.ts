import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';
import { SortOptions } from '@opensearch-project/opensearch/api/_types/_common';
import { TotalHits } from '@opensearch-project/opensearch/api/_types/_core.search';

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    this.client = new Client({
      node: this.configService.get('OPENSEARCH_NODE'),
    });
  }

  async createUser(id: string, name: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.index({
        index: 'user',
        id,
        body: {
          name,
          description: '',
          followerCount: 0,
          id,
        },
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async updateUser(id: string, name: string, description: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.update({
        index: 'user',
        id,
        body: {
          doc: {
            name,
            description,
          },
        },
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async createFeed({
    id,
    title,
    tag,
  }: {
    id: string;
    title: string;
    tag: string;
  }) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.index({
        index: 'feed',
        id,
        body: {
          title,
          tag,
          id,
          createdAt: new Date().toISOString(),
          likeCount: 0,
        },
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async updateFeed({
    id,
    title,
    tag,
  }: {
    id: string;
    title: string;
    tag: string;
  }) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.update({
        index: 'feed',
        id,
        body: {
          doc: {
            title,
            tag,
          },
        },
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async deleteFeed(id: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.delete({
        index: 'feed',
        id,
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async insertPost({
    id,
    title,
    content,
  }: {
    id: string;
    title: string;
    content: string;
  }) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.index({
        index: 'post',
        id,
        body: {
          title,
          content,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async updatePost({
    id,
    title,
    content,
  }: {
    id: string;
    title: string;
    content: string;
  }) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.update({
        index: 'post',
        id,
        body: {
          doc: {
            title,
            content,
          },
        },
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async deletePost(id: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    try {
      return await this.client.delete({
        index: 'post',
        id,
      });
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async searchUser({ keyword, cursor, size, sort }: SearchUserInput) {
    if (this.configService.get('NODE_ENV') !== 'production')
      return {
        totalCount: 0,
        ids: [],
      };

    let sortQuery: SortOptions[] = [];

    if (sort === 'popular') {
      sortQuery = [
        {
          followerCount: 'desc',
        },
        {
          id: 'desc',
        },
      ];
    } else {
      sortQuery = [
        {
          _score: 'desc',
        },
        {
          id: 'desc',
        },
      ];
    }

    try {
      const response = await this.client.search({
        index: 'user',
        body: {
          query: {
            bool: {
              should: [
                {
                  wildcard: {
                    name: {
                      value: `*${keyword}*`,
                      boost: 3,
                    },
                  },
                },
                {
                  match: {
                    description: keyword,
                  },
                },
              ],
            },
          },
          size,
          sort: sortQuery,
          from: size * cursor,
        },
      });

      const totalCount = (response.body.hits.total as TotalHits).value;
      const hits = response.body.hits.hits as UserHitData[];

      return {
        totalCount,
        ids: hits.map((hit) => hit._id),
      };
    } catch (e) {
      this.logger.error(e);
      return {
        totalCount: 0,
        ids: [],
      };
    }
  }

  async searchFeed({ keyword, cursor, size, sort }: SearchFeedInput) {
    if (this.configService.get('NODE_ENV') !== 'production')
      return {
        totalCount: 0,
        ids: [],
      };

    const sortQuery: SortOptions[] = [];

    if (sort === 'latest') {
      sortQuery.push({
        createdAt: 'desc',
      });
    } else if (sort === 'popular') {
      sortQuery.push({
        likeCount: 'desc',
      });
    } else {
      sortQuery.push({
        _score: 'desc',
      });
    }

    sortQuery.push({
      id: 'desc',
    });

    try {
      const response = await this.client.search({
        index: 'feed',
        body: {
          query: {
            multi_match: {
              query: keyword,
              fields: ['title', 'tag'],
            },
          },
          size,
          sort: sortQuery,
          from: cursor * size,
        },
      });

      const totalCount = (response.body.hits.total as TotalHits).value;
      const hits = response.body.hits.hits as FeedHitData[];

      return {
        totalCount,
        ids: hits.map((hit) => hit._id),
      };
    } catch (e) {
      this.logger.error(e);
      return {
        totalCount: 0,
        ids: [],
      };
    }
  }

  async searchPost({ keyword, page, size }: SearchPostInput) {
    if (this.configService.get('NODE_ENV') !== 'production')
      return {
        totalCount: 0,
        ids: [],
      };

    try {
      const response = await this.client.search({
        index: 'post',
        body: {
          query: {
            multi_match: {
              query: keyword,
              fields: ['title', 'content'],
            },
          },
          size,
          from: (page - 1) * size,
          sort: {
            createdAt: 'desc',
          },
        },
      });

      const totalCount = (response.body.hits.total as TotalHits).value;
      const hits = response.body.hits.hits as PostHitData[];

      return {
        totalCount,
        ids: hits.map((hit) => hit._id),
      };
    } catch (e) {
      this.logger.error(e);
      return {
        totalCount: 0,
        ids: [],
      };
    }
  }
}

export type SearchUserInput = {
  keyword: string;
  cursor: number;
  size: number;
  sort: 'popular' | 'accuracy';
};

export type SearchFeedInput = {
  keyword: string;
  cursor: number;
  size: number;
  sort: 'popular' | 'accuracy' | 'latest';
};

type SearchPostInput = {
  keyword: string;
  page: number;
  size: number;
};

type UserHitData = {
  _index: string;
  _id: string;
  _score: number;
  _source: {
    name: string;
    description: string;
    followerCount: number;
  };
};

type FeedHitData = {
  _index: string;
  _id: string;
  _score: number;
  _source: {
    title: string;
    tag: string;
    likeCount: number;
    createdAt: string;
  };
};

type PostHitData = {
  _index: string;
  _id: string;
  _source: {
    title: string;
    content: string;
    createdAt: string;
  };
};
