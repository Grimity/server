import { Controller } from '@nestjs/common';
import { FeedCommentService } from 'src/provider/feed-comment.service';

@Controller('feed-comments')
export class FeedCommentController {
  constructor(private feedCommentService: FeedCommentService) {}
}
