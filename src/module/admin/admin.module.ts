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
import { AdminPostController } from './admin-post.controller';
import { AdminPostService } from './admin-post.service';
import { AdminPostReader } from './repository/admin-post.reader';
import { AdminPostWriter } from './repository/admin-post.writer';
import { AdminPostCommentController } from './admin-post-comment.controller';
import { AdminPostCommentService } from './admin-post-comment.service';
import { AdminPostCommentReader } from './repository/admin-post-comment.reader';
import { AdminPostCommentWriter } from './repository/admin-post-comment.writer';
import { AdminNoticeController } from './admin-notice.controller';
import { AdminNoticeService } from './admin-notice.service';
import { AdminGuard } from 'src/core/guard';

@Module({
  controllers: [
    AdminController,
    AdminFeedController,
    AdminFeedCommentController,
    AdminPostController,
    AdminPostCommentController,
    AdminNoticeController,
  ],
  providers: [
    AdminService,
    AdminFeedService,
    AdminFeedReader,
    AdminFeedWriter,
    AdminFeedCommentService,
    AdminFeedCommentReader,
    AdminFeedCommentWriter,
    AdminPostService,
    AdminPostReader,
    AdminPostWriter,
    AdminPostCommentService,
    AdminPostCommentReader,
    AdminPostCommentWriter,
    AdminNoticeService,
    AdminGuard,
  ],
})
export class AdminModule {}
