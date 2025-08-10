import { Injectable } from '@nestjs/common';
import { NotificationReader } from './repository/notification.reader';
import { NotificationWriter } from './repository/notification.writer';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationReader: NotificationReader,
    private readonly notificationWriter: NotificationWriter,
  ) {}

  async getAll(userId: string) {
    return this.notificationReader.findAll(userId);
  }

  async readAll(userId: string) {
    await this.notificationWriter.readAll(userId);
    return;
  }

  async deleteAll(userId: string) {
    await this.notificationWriter.deleteAll(userId);
    return;
  }

  async readOne(userId: string, notificationId: string) {
    await this.notificationWriter.readOne(userId, notificationId);
    return;
  }

  async deleteOne(userId: string, notificationId: string) {
    await this.notificationWriter.deleteOne(userId, notificationId);
    return;
  }
}
