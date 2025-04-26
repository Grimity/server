import { Module } from '@nestjs/common';
import { AlbumController } from 'src/presentation/controller/album.controller';
import { AlbumService } from 'src/provider/album.service';
import { AlbumRepository } from 'src/repository/album.repository';

@Module({
  controllers: [AlbumController],
  providers: [AlbumService, AlbumRepository],
})
export class AlbumModule {}
