import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async updateProfileImage(userId: string, filename: string | null) {
    await this.userRepository.updateImage(userId, filename);
    return;
  }

  async updateProfile(userId: string, updateProfileInput: UpdateProfileInput) {
    const { links } = updateProfileInput;

    let transformedLinks: string[] = [];
    if (links.length > 0) {
      transformedLinks = links.map(({ linkName, link }) => {
        return `${linkName} ${link}`;
      });
    }
    await this.userRepository.updateProfile(userId, {
      ...updateProfileInput,
      links: transformedLinks,
    });
    return;
  }

  async follow(userId: string, targetUserId: string) {
    await this.userRepository.follow(userId, targetUserId);
    return;
  }

  async unfollow(userId: string, targetUserId: string) {
    await this.userRepository.unfollow(userId, targetUserId);
    return;
  }
}

export type UpdateProfileInput = {
  name: string;
  description: string;
  links: {
    linkName: string;
    link: string;
  }[];
};
