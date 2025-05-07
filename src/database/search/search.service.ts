export interface SearchService {
  insertFeed(input: InsertFeedInput): Promise<void>;
  updateFeed(input: InsertFeedInput): Promise<void>;
  deleteFeed(id: string): Promise<void>;
  deleteFeeds(ids: string[]): Promise<void>;
  insertPost(input: InsertPostInput): Promise<void>;
  updatePost(input: InsertPostInput): Promise<void>;
  deletePost(id: string): Promise<void>;
  deleteAll(input: { feedIds: string[]; postIds: string[] }): Promise<void>;
  searchFeed(
    input: CursorInput & { sort: 'popular' | 'accuracy' | 'latest' },
  ): Promise<SearchOutput>;
  searchPost(input: PageInput): Promise<SearchOutput>;
}

export type InsertFeedInput = {
  id: string;
  title: string;
  tag: string;
};

export type InsertPostInput = {
  id: string;
  title: string;
  content: string;
};

export type CursorInput = {
  keyword: string;
  cursor: number;
  size: number;
};

export type PageInput = {
  keyword: string;
  page: number;
  size: number;
};

export type SearchOutput = { totalCount: number; ids: string[] };

export const SearchService = Symbol('SearchService');
