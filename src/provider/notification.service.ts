import { Injectable } from '@nestjs/common';
import { NotificationRepository } from 'src/repository/notification.repository';

@Injectable()
export class NotificationService {
  constructor(private notificationRepository: NotificationRepository) {}

  async getAll(userId: string) {
    return this.notificationRepository.findAll(userId);
  }
}
