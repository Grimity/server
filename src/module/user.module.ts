import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { UserService } from 'src/provider/user.service';
import { UserController } from 'src/controller/user.controller';
import { FeedModule } from './feed.module';
import { AwsModule } from './aws.module';
import { OpenSearchModule } from '../database/opensearch/opensearch.module';
import { PostModule } from './post.module';
import { DdbModule } from 'src/database/ddb/ddb.module';

@Module({
  imports: [FeedModule, AwsModule, OpenSearchModule, PostModule, DdbModule],
  controllers: [UserController],
  providers: [UserRepository, UserService, UserSelectRepository],
  exports: [UserRepository, UserSelectRepository],
})
export class UserModule {}
