import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { UserService } from 'src/provider/user.service';
import { UserController } from 'src/presentation/controller/user.controller';
import { FeedModule } from './feed.module';
import { AwsModule } from './aws.module';
import { SearchModule } from 'src/database/search/search.module';
import { PostModule } from './post.module';
import { DdbModule } from 'src/database/ddb/ddb.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [
    FeedModule,
    AwsModule,
    SearchModule,
    PostModule,
    DdbModule,
    RedisModule,
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService, UserSelectRepository],
  exports: [UserRepository, UserSelectRepository],
})
export class UserModule {}
