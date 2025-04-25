import { Module } from '@nestjs/common';
import { AlbumController } from 'src/presentation/controller/album.controller';
import { AlbumService } from 'src/provider/album.service';

@Module({
  controllers: [AlbumController],
  providers: [AlbumService],
})
export class AlbumModule {}
