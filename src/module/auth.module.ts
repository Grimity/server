import { Module } from '@nestjs/common';
import { AuthController } from 'src/presentation/controller/auth.controller';
import { AuthService } from 'src/provider/auth.service';
import { UserModule } from 'src/module/user.module';
import { SearchModule } from 'src/database/search/search.module';

@Module({
  imports: [UserModule, SearchModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
