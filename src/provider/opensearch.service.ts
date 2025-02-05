import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';
import { QueryContainer } from '@opensearch-project/opensearch/api/_types/_common.query_dsl';
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

    const must: QueryContainer[] = [
      {
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
    ];

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
            must,
          },
        },
        size,
        sort: sortQuery,
        from: cursor ? size * cursor : 0,
      },
    });

    const hits = response.body.hits.hits as UserHitData[];

    return hits.map((hit) => {
      return {
        id: hit._id,
        followerCount: hit._source.followerCount,
      };
    });
  }
}

export type SearchUserInput = {
  keyword: string;
  cursor: number;
  size: number;
  sort: 'popular' | 'accuracy';
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
