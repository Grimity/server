import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserService } from 'src/provider/user.service';
import { UserController } from 'src/controller/user.controller';
import { FeedModule } from './feed.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [FeedModule, NotificationModule],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
