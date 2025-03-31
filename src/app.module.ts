import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { globalPipe } from './core/pipe/global.pipe';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './module/auth.module';
import { AwsModule } from './module/aws.module';
import { FeedModule } from './module/feed.module';
import { FeedCommentModule } from './module/feed-comment.module';
import { NotificationModule } from './module/notification.module';
import { TagModule } from './module/tag.module';
import { PostModule } from './module/post.module';
import { PostCommentModule } from './module/post-comment.module';
import { ReportModule } from './module/report.module';
import { GlobalFilter } from './core/filter';
import { APP_FILTER } from '@nestjs/core';
import { RedisModule } from './database/redis/redis.module';
import { ClientInfoMiddleware } from './core/middleware';

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
    PostModule,
    PostCommentModule,
    ReportModule,
    RedisModule,
  ],
  providers: [
    globalPipe,
    {
      provide: APP_FILTER,
      useClass: GlobalFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClientInfoMiddleware).forRoutes('auth');
  }
}
