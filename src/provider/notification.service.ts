import { Injectable } from '@nestjs/common';
import { NotificationRepository } from 'src/repository/notification.repository';

@Injectable()
export class NotificationService {
  constructor(private notificationRepository: NotificationRepository) {}

  async getAll(userId: string) {
    return this.notificationRepository.findAll(userId);
  }

  async readAll(userId: string) {
    await this.notificationRepository.readAll(userId);
    return;
  }

  async deleteAll(userId: string) {
    await this.notificationRepository.deleteAll(userId);
    return;
  }

  async readOne(userId: string, notificationId: string) {
    await this.notificationRepository.readOne(userId, notificationId);
    return;
  }
}
