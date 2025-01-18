import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedRepository } from 'src/repository/feed.repository';
import { AwsService } from './aws.service';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedRepository: FeedRepository,
    private awsService: AwsService,
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
        return `${linkName.replaceAll(' ', '')} ${link.trim()}`;
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

    await this.awsService.pushEvent({
      type: 'FOLLOW',
      actorId: userId,
      userId: targetUserId,
    });
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
      email: targetUser.email.replace(/(.{3})@/, '***@'),
      links: targetUser.links.map((link) => {
        const [linkName, linkUrl] = link.split(' ');
        return {
          linkName,
          link: linkUrl,
        };
      }),
      followerCount: targetUser._count.followers,
      followingCount: targetUser._count.followings,
      feedCount: targetUser._count.feeds,
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
      // 이메일 골뱅이앞 3자리 별표
      email: user.email.replace(/(.{3})@/, '***@'),
      followerCount: user._count.followers,
      followingCount: user._count.followings,
      feedCount: user._count.feeds,
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

  async getPopularUsers() {
    const results = await this.userRepository.findPopular();
    return results.map((result) => {
      return {
        id: result.id,
        name: result.name,
        image: result.image,
        followerCount: result._count.followers,
        feedCount: result._count.feeds,
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
