import { Module } from '@nestjs/common';
import { AlbumController } from './album.controller';
import { AlbumService } from './album.service';
import { AlbumRepository } from './repository/album.repository';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [FeedModule],
  controllers: [AlbumController],
  providers: [AlbumService, AlbumRepository],
  exports: [AlbumRepository],
})
export class AlbumModule {}
