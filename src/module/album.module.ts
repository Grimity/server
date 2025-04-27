import { Module } from '@nestjs/common';
import { AlbumController } from 'src/presentation/controller/album.controller';
import { AlbumService } from 'src/provider/album.service';
import { AlbumRepository } from 'src/repository/album.repository';
import { FeedModule } from './feed.module';

@Module({
  imports: [FeedModule],
  controllers: [AlbumController],
  providers: [AlbumService, AlbumRepository],
  exports: [AlbumRepository],
})
export class AlbumModule {}
