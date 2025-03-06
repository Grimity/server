import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { OpenSearchService } from './opensearch/opensearch.service';
import { OpenSearchMockService } from './opensearch/opensearch.mock.service';

@Module({
  providers: [
    {
      provide: SearchService,
      useClass:
        process.env.NODE_ENV === 'production'
          ? OpenSearchService
          : OpenSearchMockService,
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
