import { Injectable } from '@nestjs/common';

@Injectable()
export class AlbumService {
  constructor() {}

  async create(userId: string) {
    console.log(userId);
  }
}
