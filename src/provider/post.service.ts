import { Injectable } from '@nestjs/common';
import { PostRepository } from 'src/repository/post.repository';

@Injectable()
export class PostService {
  constructor(private postRepository: PostRepository) {}
}
