import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { globalPipe } from './core/pipe/global.pipe';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './module/auth/auth.module';
import { AwsModule } from './module/aws/aws.module';
import { FeedModule } from './module/feed/feed.module';
import { FeedCommentModule } from './module/feed-comment/feed-comment.module';
import { NotificationModule } from './module/notification/notification.module';
import { PostModule } from './module/post/post.module';
import { PostCommentModule } from './module/post-comment/post-comment.module';
import { ReportModule } from './module/report/report.module';
import { GlobalFilter } from './core/filter';
import { APP_FILTER } from '@nestjs/core';
import { RedisModule } from './database/redis/redis.module';
import { ClientInfoMiddleware } from './core/middleware';
import { AlbumModule } from './module/album/album.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { PrismaService } from './database/prisma/prisma.service';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

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
    PostModule,
    PostCommentModule,
    ReportModule,
    RedisModule,
    AlbumModule,
    EventEmitterModule.forRoot({
      delimiter: '.',
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [
            // module in which the PrismaClient is provided
            PrismaModule,
          ],
          adapter: new TransactionalAdapterPrisma({
            // the injection token of the PrismaClient
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    }),
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
