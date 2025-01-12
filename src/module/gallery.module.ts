import { Module } from '@nestjs/common';
import { GalleryController } from 'src/controller/gallery.controller';
import { GalleryService } from 'src/provider/gallery.service';
import { GalleryRepository } from 'src/repository/gallery.repository';

@Module({
  controllers: [GalleryController],
  providers: [GalleryService, GalleryRepository],
})
export class GalleryModule {}
