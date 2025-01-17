import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserService } from 'src/provider/user.service';
import { UserController } from 'src/controller/user.controller';
import { FeedModule } from './feed.module';

@Module({
  imports: [FeedModule],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
