import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedRepository } from 'src/repository/feed.repository';
import { AwsService } from './aws.service';
import { NotificationRepository } from 'src/repository/notification.repository';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedRepository: FeedRepository,
    private awsService: AwsService,
    private notificationRepository: NotificationRepository,
  ) {}

  async updateProfileImage(userId: string, imageName: string | null) {
    await this.userRepository.updateImage(userId, imageName);
    return;
  }

  async updateBackgroundImage(userId: string, imageName: string | null) {
    await this.userRepository.updateBackgroundImage(userId, imageName);
    return;
  }

  async updateProfile(userId: string, updateProfileInput: UpdateProfileInput) {
    const { links } = updateProfileInput;

    let transformedLinks: string[] = [];
    if (links.length > 0) {
      transformedLinks = links.map(({ linkName, link }) => {
        return `${linkName.trim()}|~|${link.trim()}`;
      });
    }
    await this.userRepository.updateProfile(userId, {
      ...updateProfileInput,
      links: transformedLinks,
    });
    return;
  }

  async getMyProfile(userId: string) {
    const [user, hasNotification] = await Promise.all([
      this.userRepository.getMyProfile(userId),
      this.notificationRepository.hasUnread(userId),
    ]);

    return {
      id: user.id,
      provider: user.provider,
      email: user.email,
      name: user.name,
      image: user.image,
      description: user.description,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split('|~|');
        return {
          linkName,
          link: linkUrl,
        };
      }),
      backgroundImage: user.backgroundImage,
      createdAt: user.createdAt,
      hasNotification,
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

  async getMyFollowers(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const followers = await this.userRepository.findMyFollowers(userId, {
      cursor,
      size,
    });

    return {
      nextCursor:
        followers.length === size
          ? followers[followers.length - 1].follower.id
          : null,
      followers: followers.map((follower) => {
        return {
          id: follower.follower.id,
          name: follower.follower.name,
          image: follower.follower.image,
          description: follower.follower.description,
        };
      }),
    };
  }

  async getMyFollowings(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const followings = await this.userRepository.findMyFollowings(userId, {
      cursor,
      size,
    });

    return {
      nextCursor:
        followings.length === size
          ? followings[followings.length - 1].following.id
          : null,
      followings: followings.map((following) => {
        return {
          id: following.following.id,
          name: following.following.name,
          image: following.following.image,
          description: following.following.description,
        };
      }),
    };
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
      backgroundImage: targetUser.backgroundImage,
      description: targetUser.description,
      links: targetUser.links.map((link) => {
        const [linkName, linkUrl] = link.split('|~|');
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
      backgroundImage: user.backgroundImage,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split('|~|');
        return {
          linkName,
          link: linkUrl,
        };
      }),
      followerCount: user._count.followers,
      followingCount: user._count.followings,
      feedCount: user._count.feeds,
      isFollowing: false,
    };
  }

  async getFeedsByUser(userId: string, input: GetFeedsInput) {
    const feeds = await this.feedRepository.findManyByUserId(userId, input);

    let nextCursor: string | null = null;
    if (feeds.length === input.size) {
      if (input.sort === 'latest' || input.sort === 'oldest') {
        nextCursor = `${feeds[feeds.length - 1].createdAt.toISOString()}_${feeds[feeds.length - 1].id}`;
      } else {
        nextCursor = `${feeds[feeds.length - 1].likeCount}_${feeds[feeds.length - 1].id}`;
      }
    }

    return {
      nextCursor,
      feeds: feeds.map((feed) => {
        return {
          id: feed.id,
          title: feed.title,
          cards: feed.cards,
          createdAt: feed.createdAt,
          viewCount: feed.viewCount,
          likeCount: feed.likeCount,
          commentCount: feed._count.feedComments,
          thumbnail: feed.thumbnail,
        };
      }),
    };
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

type GetFeedsInput = {
  sort: 'latest' | 'like' | 'oldest';
  size: number;
  cursor: string | null;
};
