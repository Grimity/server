import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { UserService } from 'src/provider/user.service';
import { UserController } from 'src/controller/user.controller';
import { FeedModule } from './feed.module';
import { AwsModule } from './aws.module';
import { NotificationModule } from './notification.module';
import { OpenSearchModule } from './opensearch.module';

@Module({
  imports: [FeedModule, AwsModule, NotificationModule, OpenSearchModule],
  controllers: [UserController],
  providers: [UserRepository, UserService, UserSelectRepository],
  exports: [UserRepository, UserSelectRepository],
})
export class UserModule {}
