import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserService } from 'src/provider/user.service';
import { UserController } from 'src/controller/user.controller';

@Module({
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
