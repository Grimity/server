import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';
import { SortOptions } from '@opensearch-project/opensearch/api/_types/_common';
import { TotalHits } from '@opensearch-project/opensearch/api/_types/_core.search';
import {
  CursorInput,
  InsertFeedInput,
  InsertPostInput,
  PageInput,
  SearchOutput,
  SearchService,
} from '../search.service';

const requestTimeout = 1000;
const searchTimeout = 3000;

@Injectable()
export class OpenSearchService implements SearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      node: this.configService.get('OPENSEARCH_NODE'),
    });
  }

  async insertFeed({ id, title, tag }: InsertFeedInput): Promise<void> {
    try {
      await this.client.index(
        {
          index: 'feed',
          id,
          body: {
            title,
            tag,
            id,
            createdAt: new Date().toISOString(),
            likeCount: 0,
          },
        },
        {
          requestTimeout,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async updateFeed({ id, title, tag }: InsertFeedInput): Promise<void> {
    try {
      await this.client.update(
        {
          index: 'feed',
          id,
          body: {
            doc: {
              title,
              tag,
            },
          },
        },
        {
          requestTimeout: 100,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async deleteFeed(id: string) {
    try {
      await this.client.delete(
        {
          index: 'feed',
          id,
        },
        {
          requestTimeout,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async deleteFeeds(ids: string[]) {
    try {
      await this.client.deleteByQuery(
        {
          index: 'feed',
          body: {
            query: {
              ids: {
                values: ids,
              },
            },
          },
        },
        {
          requestTimeout,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async insertPost({ id, title, content }: InsertPostInput): Promise<void> {
    try {
      await this.client.index(
        {
          index: 'post',
          id,
          body: {
            title,
            content,
            createdAt: new Date().toISOString(),
          },
        },
        {
          requestTimeout,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async updatePost({ id, title, content }: InsertPostInput) {
    try {
      await this.client.update(
        {
          index: 'post',
          id,
          body: {
            doc: {
              title,
              content,
            },
          },
        },
        {
          requestTimeout,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async deletePost(id: string) {
    try {
      await this.client.delete(
        {
          index: 'post',
          id,
        },
        {
          requestTimeout,
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async deleteAll({
    feedIds,
    postIds,
  }: {
    feedIds: string[];
    postIds: string[];
  }) {
    try {
      await Promise.all([
        this.client.deleteByQuery(
          {
            index: 'feed',
            body: {
              query: {
                ids: {
                  values: feedIds,
                },
              },
            },
          },
          {
            requestTimeout,
          },
        ),
        this.client.deleteByQuery(
          {
            index: 'post',
            body: {
              query: {
                ids: {
                  values: postIds,
                },
              },
            },
          },
          {
            requestTimeout,
          },
        ),
      ]);
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }

  async searchFeed({
    keyword,
    cursor,
    size,
    sort,
  }: CursorInput & {
    sort: 'popular' | 'accuracy' | 'latest';
  }): Promise<SearchOutput> {
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
      const response = await this.client.search(
        {
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
        },
        {
          requestTimeout: searchTimeout,
        },
      );

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

  async searchPost({ keyword, page, size }: PageInput): Promise<SearchOutput> {
    try {
      const response = await this.client.search(
        {
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
        },
        {
          requestTimeout: searchTimeout,
        },
      );

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
