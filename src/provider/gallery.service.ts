import { Injectable } from '@nestjs/common';
import { GalleryRepository } from 'src/repository/gallery.repository';

@Injectable()
export class GalleryService {
  constructor(private galleryRepository: GalleryRepository) {}
}
