import { Controller } from '@nestjs/common';
import { PostCommentService } from 'src/provider/post-comment.service';

@Controller('post-comments')
export class PostCommentController {
  constructor(private postCommentService: PostCommentService) {}
}
