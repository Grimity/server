import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FeedCommentService } from 'src/provider/feed-comment.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { CreateFeedCommentDto } from './dto/feed-comment';

@Controller('feed-comments')
export class FeedCommentController {
  constructor(private feedCommentService: FeedCommentService) {}

  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() createFeedCommentDto: CreateFeedCommentDto,
  ) {
    await this.feedCommentService.create(userId, createFeedCommentDto);
    return;
  }
}
