import { Injectable, HttpException } from '@nestjs/common';
import { AlbumRepository } from 'src/repository/album.repository';
import { FeedRepository } from 'src/repository/feed.repository';

@Injectable()
export class AlbumService {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly feedRepository: FeedRepository,
  ) {}

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

  async updateOrder(userId: string, ids: string[]) {
    const toUpdate = ids.map((id, index) => ({
      id,
      order: index + 1,
    }));

    await this.albumRepository.updateOrder(userId, toUpdate);
    return;
  }

  async removeFeedsAlbum(userId: string, ids: string[]) {
    await this.feedRepository.updateAlbum(userId, {
      feedIds: ids,
      albumId: null,
    });
  }

  async insertFeeds(
    userId: string,
    {
      albumId,
      feedIds,
    }: {
      albumId: string;
      feedIds: string[];
    },
  ) {
    const album = await this.albumRepository.findOneById(albumId);

    if (!album) throw new HttpException('ALBUM', 404);

    if (album.userId !== userId)
      throw new HttpException('앨범 소유자가 아닙니다', 403);

    await this.feedRepository.updateAlbum(userId, { albumId, feedIds });
    return;
  }
}
