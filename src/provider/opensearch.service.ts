import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';
import { SortOptions } from '@opensearch-project/opensearch/api/_types/_common';

@Injectable()
export class OpenSearchService {
  private client: Client;

  constructor(private configService: ConfigService) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    this.client = new Client({
      node: this.configService.get('OPENSEARCH_NODE'),
    });
  }

  async createUser(id: string, name: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
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
  }

  async updateUser(id: string, name: string, description: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
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
  }

  async searchUser({ keyword, cursor, size, sort }: SearchUserInput) {
    if (this.configService.get('NODE_ENV') !== 'production') return;

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

    const hits = response.body.hits.hits as UserHitData[];

    return hits.map((hit) => hit._id);
  }

  async searchFeed({ keyword, cursor, size, sort }: SearchFeedInput) {
    if (this.configService.get('NODE_ENV') !== 'production') return;

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

    const hits = response.body.hits.hits as FeedHitData[];

    return hits.map((hit) => hit._id);
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
