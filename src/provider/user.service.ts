import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedRepository } from 'src/repository/feed.repository';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedRepository: FeedRepository,
  ) {}

  async updateProfileImage(userId: string, imageName: string | null) {
    await this.userRepository.updateImage(userId, imageName);
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

  async getMyProfile(userId: string) {
    const user = await this.userRepository.getMyProfile(userId);

    return {
      id: user.id,
      provider: user.provider,
      email: user.email,
      name: user.name,
      image: user.image,
      description: user.description,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split(' ');
        return {
          linkName,
          link: linkUrl,
        };
      }),
      createdAt: user.createdAt,
      followerCount: user._count.followers,
      followingCount: user._count.followings,
    };
  }

  async follow(userId: string, targetUserId: string) {
    await this.userRepository.follow(userId, targetUserId);
    return;
  }

  async unfollow(userId: string, targetUserId: string) {
    await this.userRepository.unfollow(userId, targetUserId);
    return;
  }

  async getUserProfile(userId: string | null, targetUserId: string) {
    if (userId) {
      return this.getUserProfileWithLogin(userId, targetUserId);
    }
    return this.getUserProfileWithoutLogin(targetUserId);
  }

  async getMyFollowers(userId: string) {
    return await this.userRepository.findMyFollowers(userId);
  }

  async getUserProfileWithLogin(userId: string, targetUserId: string) {
    const [targetUser, isFollowing] = await Promise.all([
      this.userRepository.getUserProfile(targetUserId),
      this.userRepository.isFollowing(userId, targetUserId),
    ]);

    return {
      id: targetUser.id,
      name: targetUser.name,
      image: targetUser.image,
      description: targetUser.description,
      links: targetUser.links.map((link) => {
        const [linkName, linkUrl] = link.split(' ');
        return {
          linkName,
          link: linkUrl,
        };
      }),
      followerCount: targetUser._count.followers,
      followingCount: targetUser._count.followings,
      isFollowing,
    };
  }

  async getUserProfileWithoutLogin(targetUserId: string) {
    const user = await this.userRepository.getUserProfile(targetUserId);

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      description: user.description,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split(' ');
        return {
          linkName,
          link: linkUrl,
        };
      }),
      followerCount: user._count.followers,
      followingCount: user._count.followings,
      isFollowing: false,
    };
  }

  async getFollowers(userId: string) {
    const results = await this.userRepository.findFollowers(userId);
    return results.map((result) => {
      return {
        id: result.follower.id,
        name: result.follower.name,
        image: result.follower.image,
        followerCount: result.follower._count.followers,
      };
    });
  }

  async getFollowings(userId: string) {
    const results = await this.userRepository.findFollowings(userId);
    return results.map((result) => {
      return {
        id: result.following.id,
        name: result.following.name,
        image: result.following.image,
        followerCount: result.following._count.followers,
      };
    });
  }

  async getFeedsByUser(
    userId: string,
    { lastId, lastCreatedAt }: GetFeedsCursor,
  ) {
    let feeds;
    if (lastId && lastCreatedAt) {
      feeds = await this.feedRepository.findManyByUserIdWithCursor(userId, {
        lastId,
        lastCreatedAt,
      });
    } else {
      feeds = await this.feedRepository.findManyByUserId(userId);
    }

    return feeds.map((feed) => {
      return {
        id: feed.id,
        title: feed.title,
        cards: feed.cards,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        commentCount: feed._count.feedComments,
      };
    });
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

type GetFeedsCursor = {
  lastId?: string;
  lastCreatedAt?: string;
};
