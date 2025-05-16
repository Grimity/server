import { Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagRepository } from './repository/tag.repository';
import { TagService } from './tag.service';
import { SearchModule } from 'src/database/search/search.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [SearchModule, RedisModule],
  controllers: [TagController],
  providers: [TagService, TagRepository],
})
export class TagModule {}
