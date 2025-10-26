import { Module } from '@nestjs/common';
import { UserWriter } from './repository/user.writer';
import { UserReader } from './repository/user.reader';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FeedModule } from '../feed/feed.module';
import { SearchModule } from 'src/database/search/search.module';
import { PostModule } from '../post/post.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { MeController } from './me.controller';
import { AlbumModule } from '../album/album.module';

@Module({
  imports: [FeedModule, SearchModule, PostModule, RedisModule, AlbumModule],
  controllers: [UserController, MeController],
  providers: [UserWriter, UserService, UserReader],
  exports: [UserWriter, UserReader],
})
export class UserModule {}
