import { Controller } from '@nestjs/common';
import { PostService } from 'src/provider/post.service';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}
}
