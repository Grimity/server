import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async updateProfileImage(userId: string, filename: string) {
    await this.userRepository.updateImage(userId, filename);
    return;
  }
}
