import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './module/prisma.module';
import { globalPipe } from './common/pipe/global.pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      cache: true,
    }),
    PrismaModule,
  ],
  providers: [globalPipe],
})
export class AppModule {}
