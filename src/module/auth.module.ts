import { Module } from '@nestjs/common';
import { AuthController } from 'src/controller/auth.controller';
import { AuthService } from 'src/provider/auth.service';
import { UserModule } from 'src/module/user.module';
import { OpenSearchModule } from './opensearch.module';

@Module({
  imports: [UserModule, OpenSearchModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
