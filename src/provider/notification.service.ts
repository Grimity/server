import { Injectable } from '@nestjs/common';
import { NotificationRepository } from 'src/repository/notification.repository';

@Injectable()
export class NotificationService {
  constructor(private notificationRepository: NotificationRepository) {}

  async getAll(userId: string) {
    return await this.notificationRepository.findAllByUserId(userId);
  }

  async readAll(userId: string) {
    await this.notificationRepository.readAll(userId);
    return;
  }

  async read(userId: string, notificationId: string) {
    await this.notificationRepository.read(userId, notificationId);
    return;
  }
}
