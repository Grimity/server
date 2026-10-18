import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from 'src/module/auth/auth.service';
import { UserModule } from '../user/user.module';
import { WebSessionService } from './web-session.service';

@Global()
@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [AuthService, WebSessionService],
  exports: [WebSessionService],
})
export class AuthModule {}
