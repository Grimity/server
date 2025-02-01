import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './module/prisma.module';
import { globalPipe } from './common/pipe/global.pipe';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './module/auth.module';
import { AwsModule } from './module/aws.module';
import { FeedModule } from './module/feed.module';
import { FeedCommentModule } from './module/feed-comment.module';
import { NotificationModule } from './module/notification.module';
import { TagModule } from './module/tag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      cache: true,
    }),
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
      global: true,
    }),
    AuthModule,
    AwsModule,
    FeedModule,
    FeedCommentModule,
    NotificationModule,
    TagModule,
  ],
  providers: [globalPipe],
})
export class AppModule {}
