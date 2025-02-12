import { Module } from '@nestjs/common';
import { TagController } from 'src/controller/tag.controller';
import { TagRepository } from 'src/repository/tag.repository';
import { TagService } from 'src/provider/tag.service';
import { OpenSearchModule } from './opensearch.module';
import { RedisModule } from './redis.module';

@Module({
  imports: [OpenSearchModule, RedisModule],
  controllers: [TagController],
  providers: [TagService, TagRepository],
})
export class TagModule {}
