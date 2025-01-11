import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';

@Module({
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
