import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminFeedController } from './admin-feed.controller';
import { AdminFeedService } from './admin-feed.service';
import { AdminFeedReader } from './repository/admin-feed.reader';
import { AdminFeedWriter } from './repository/admin-feed.writer';
import { AdminFeedCommentController } from './admin-feed-comment.controller';
import { AdminFeedCommentService } from './admin-feed-comment.service';
import { AdminFeedCommentReader } from './repository/admin-feed-comment.reader';
import { AdminFeedCommentWriter } from './repository/admin-feed-comment.writer';
import { AdminGuard } from 'src/core/guard';

@Module({
  controllers: [
    AdminController,
    AdminFeedController,
    AdminFeedCommentController,
  ],
  providers: [
    AdminService,
    AdminFeedService,
    AdminFeedReader,
    AdminFeedWriter,
    AdminFeedCommentService,
    AdminFeedCommentReader,
    AdminFeedCommentWriter,
    AdminGuard,
  ],
})
export class AdminModule {}
