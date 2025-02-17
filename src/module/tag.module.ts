import { Module } from '@nestjs/common';
import { TagController } from 'src/controller/tag.controller';
import { TagRepository } from 'src/repository/tag.repository';
import { TagService } from 'src/provider/tag.service';
import { OpenSearchModule } from '../database/opensearch/opensearch.module';

@Module({
  imports: [OpenSearchModule],
  controllers: [TagController],
  providers: [TagService, TagRepository],
})
export class TagModule {}
