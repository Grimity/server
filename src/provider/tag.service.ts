import { Injectable } from '@nestjs/common';
import { TagRepository } from 'src/repository/tag.repository';

@Injectable()
export class TagService {
  constructor(private tagRepository: TagRepository) {}

  async findPopularTags() {
    return await this.tagRepository.findPopularTags();
  }
}
