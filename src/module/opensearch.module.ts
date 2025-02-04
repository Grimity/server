import { Module } from '@nestjs/common';
import { OpenSearchService } from 'src/provider/opensearch.service';

@Module({
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
