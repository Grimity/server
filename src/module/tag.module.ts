import { Module } from '@nestjs/common';
import { TagController } from 'src/presentation/controller/tag.controller';
import { TagRepository } from 'src/repository/tag.repository';
import { TagService } from 'src/provider/tag.service';
import { SearchModule } from 'src/database/search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [TagController],
  providers: [TagService, TagRepository],
})
export class TagModule {}
