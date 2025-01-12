import { Injectable } from '@nestjs/common';
import { GalleryRepository } from 'src/repository/gallery.repository';

@Injectable()
export class GalleryService {
  constructor(private galleryRepository: GalleryRepository) {}

  async create(userId: string, createGalleryInput: CreateGalleryInput) {
    return await this.galleryRepository.create(userId, createGalleryInput);
  }
}

export type CreateGalleryInput = {
  title: string;
  images: string[];
  isAI: boolean;
  content: string;
  tags: string[];
};
