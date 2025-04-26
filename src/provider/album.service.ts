import { Injectable, HttpException } from '@nestjs/common';
import { AlbumRepository } from 'src/repository/album.repository';

@Injectable()
export class AlbumService {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async create(userId: string, name: string) {
    const albums = await this.albumRepository.findManyByUserId(userId);

    if (albums.length === 8) {
      throw new HttpException('앨범 개수 최대 8개', 400);
    }

    if (albums.some((album) => album.name === name)) {
      throw new HttpException('NAME', 409);
    }

    return await this.albumRepository.create(userId, {
      name,
      order: albums.length === 0 ? 1 : albums[albums.length - 1].order + 1,
    });
  }

  async updateOne({
    userId,
    id,
    name,
  }: {
    userId: string;
    id: string;
    name: string;
  }) {
    const albums = await this.albumRepository.findManyByUserId(userId);

    for (const album of albums) {
      if (album.name === name) {
        if (album.id === id) return;
        throw new HttpException('NAME', 409);
      }
    }

    await this.albumRepository.updateOne({ userId, id, name });
    return;
  }

  async deleteOne(userId: string, id: string) {
    await this.albumRepository.deleteOne(userId, id);
  }
}
