import { Module } from '@nestjs/common';
import { UserWriter } from './repository/user.writer';
import { UserReader } from './repository/user.reader';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FeedModule } from '../feed/feed.module';
import { PostModule } from '../post/post.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { MeController } from './me.controller';
import { AlbumModule } from '../album/album.module';
import { PortOneModule } from 'src/infrastructure/portone/portone.module';

@Module({
  imports: [FeedModule, PostModule, RedisModule, AlbumModule, PortOneModule],
  controllers: [UserController, MeController],
  providers: [UserWriter, UserService, UserReader],
  exports: [UserWriter, UserReader],
})
export class UserModule {}
