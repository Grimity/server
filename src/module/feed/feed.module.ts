import { Module, forwardRef } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedWriter } from './repository/feed.writer';
import { FeedReader } from './repository/feed.reader';
import { RedisModule } from 'src/database/redis/redis.module';
import { TagController } from './tag.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [RedisModule, forwardRef(() => UserModule)],
  controllers: [FeedController, TagController],
  providers: [FeedService, FeedReader, FeedWriter],
  exports: [FeedReader, FeedWriter],
})
export class FeedModule {}
