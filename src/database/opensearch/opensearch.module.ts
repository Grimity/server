import { Module } from '@nestjs/common';
import { OpenSearchService } from 'src/database/opensearch/opensearch.service';

@Module({
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
