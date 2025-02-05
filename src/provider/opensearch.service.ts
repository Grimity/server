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

      if (cursor) {
        const [followerCount, id] = cursor.split('_');

        must.push({
          bool: {
            should: [
              {
                range: {
                  followerCount: {
                    lt: Number(followerCount),
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      term: {
                        followerCount: Number(followerCount),
                      },
                    },
                    {
                      range: {
                        id: {
                          lt: id,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        });
      }
    } else {
      sortQuery = [
        {
          _score: 'desc',
        },
        {
          id: 'desc',
        },
      ];

      if (cursor) {
        const [score, id] = cursor.split('_');

        must.push({
          bool: {
            should: [
              {
                range: {
                  _score: {
                    lt: Number(score),
                    boost: 0,
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      range: {
                        _score: {
                          lte: Number(score),
                          boost: 0,
                        },
                      },
                    },
                    {
                      range: {
                        id: {
                          lt: id,
                          boost: 0,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        });
      }
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
      },
    });

    const hits = response.body.hits.hits as UserHitData[];

    return hits.map((hit) => {
      return {
        id: hit._id,
        score: hit._score,
        followerCount: hit._source.followerCount,
      };
    });
  }
}

export type SearchUserInput = {
  keyword: string;
  cursor: string | null;
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
