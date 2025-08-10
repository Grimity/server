import { Module } from '@nestjs/common';
import { AlbumController } from './album.controller';
import { AlbumService } from './album.service';
import { AlbumWriter } from './repository/album.writer';
import { AlbumReader } from './repository/album.reader';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [FeedModule],
  controllers: [AlbumController],
  providers: [AlbumService, AlbumWriter, AlbumReader],
  exports: [AlbumWriter, AlbumReader],
})
export class AlbumModule {}
