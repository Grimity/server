import { Module } from '@nestjs/common';
import { UserRepository } from './repository/user.repository';
import { UserSelectRepository } from './repository/user.select.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FeedModule } from '../feed/feed.module';
import { AwsModule } from '../aws/aws.module';
import { SearchModule } from 'src/database/search/search.module';
import { PostModule } from '../post/post.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { MeController } from './me.controller';
import { AlbumModule } from '../album/album.module';

@Module({
  imports: [
    FeedModule,
    AwsModule,
    SearchModule,
    PostModule,
    RedisModule,
    AlbumModule,
  ],
  controllers: [UserController, MeController],
  providers: [UserRepository, UserService, UserSelectRepository],
  exports: [UserRepository, UserSelectRepository],
})
export class UserModule {}
