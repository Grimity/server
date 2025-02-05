import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsService } from './aws.service';
import { NotificationRepository } from 'src/repository/notification.repository';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { OpenSearchService } from './opensearch.service';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedSelectRepository: FeedSelectRepository,
    private awsService: AwsService,
    private notificationRepository: NotificationRepository,
    private userSelectRepository: UserSelectRepository,
    private openSearchService: OpenSearchService,
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
    await this.openSearchService.updateUser(
      userId,
      updateProfileInput.name,
      updateProfileInput.description,
    );
    return;
  }

  async getMyProfile(userId: string) {
    const [user, hasNotification] = await Promise.all([
      this.userSelectRepository.getMyProfile(userId),
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

    // await this.awsService.pushEvent({
    //   type: 'FOLLOW',
    //   actorId: userId,
    //   userId: targetUserId,
    // });
    await this.awsService.pushOpensearchQueue('USER', targetUserId);
    return;
  }

  async unfollow(userId: string, targetUserId: string) {
    await this.userRepository.unfollow(userId, targetUserId);
    await this.awsService.pushOpensearchQueue('USER', targetUserId);
    return;
  }

  async getUserProfile(userId: string | null, targetUserId: string) {
    const targetUser = await this.userSelectRepository.getUserProfile(
      userId,
      targetUserId,
    );

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
      followerCount: targetUser.followerCount,
      followingCount: targetUser._count.followings,
      feedCount: targetUser._count.feeds,
      isFollowing: targetUser.followers?.length === 1,
    };
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
    const followers = await this.userSelectRepository.findMyFollowers(userId, {
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
    const followings = await this.userSelectRepository.findMyFollowings(
      userId,
      {
        cursor,
        size,
      },
    );

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

  async getFeedsByUser(input: GetFeedsInput) {
    const feeds = await this.feedSelectRepository.findManyByUserId(input);

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

  async getMyLikeFeeds(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const feeds = await this.feedSelectRepository.findMyLikeFeeds(userId, {
      cursor,
      size,
    });

    let nextCursor: string | null = null;
    if (feeds.length === size) {
      nextCursor = `${feeds[feeds.length - 1].createdAt.toISOString()}`;
    }

    return {
      nextCursor,
      feeds: feeds.map((feed) => {
        return {
          id: feed.feed.id,
          title: feed.feed.title,
          cards: feed.feed.cards,
          createdAt: feed.createdAt,
          viewCount: feed.feed.viewCount,
          likeCount: feed.feed.likeCount,
          commentCount: feed.feed._count.feedComments,
          thumbnail: feed.feed.thumbnail,
          author: feed.feed.author,
        };
      }),
    };
  }

  async getMySaveFeeds(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const feeds = await this.feedSelectRepository.findMySaveFeeds(userId, {
      cursor,
      size,
    });

    let nextCursor: string | null = null;
    if (feeds.length === size) {
      nextCursor = `${feeds[feeds.length - 1].createdAt.toISOString()}`;
    }

    return {
      nextCursor,
      feeds: feeds.map((feed) => {
        return {
          id: feed.feed.id,
          title: feed.feed.title,
          cards: feed.feed.cards,
          createdAt: feed.createdAt,
          viewCount: feed.feed.viewCount,
          likeCount: feed.feed.likeCount,
          commentCount: feed.feed._count.feedComments,
          thumbnail: feed.feed.thumbnail,
          author: feed.feed.author,
        };
      }),
    };
  }

  async getPopularUsers(userId: string | null) {
    const users = await this.userSelectRepository.getPopularUsers(userId);

    return users.map((user) => {
      return {
        id: user.id,
        name: user.name,
        image: user.image,
        followerCount: user.followerCount,
        isFollowing: user.followers?.length === 1,
        thumbnails: user.feeds.map((feed) => {
          return feed.thumbnail;
        }),
      };
    });
  }

  async searchUsers(input: SearchUserInput) {
    const searchedUsers = await this.openSearchService.searchUser(input);

    let nextCursor: string | null = null;

    if (searchedUsers === undefined || searchedUsers.length === 0) {
      return {
        nextCursor,
        users: [],
      };
    }

    const users = await this.userSelectRepository.findManyByUserIds(
      input.userId,
      searchedUsers.map((user) => user.id),
    );

    const returnUsers = [];

    for (const searchedUser of searchedUsers) {
      const user = users.find((user) => user.id === searchedUser.id);
      if (user) {
        returnUsers.push({
          id: user.id,
          name: user.name,
          image: user.image,
          description: user.description,
          backgroundImage: user.backgroundImage,
          followerCount: user.followerCount,
          isFollowing: user.followers?.length === 1,
        });
      }
    }

    if (searchedUsers.length === input.size) {
      if (input.sort === 'popular') {
        nextCursor = `${searchedUsers[searchedUsers.length - 1].followerCount}_${searchedUsers[searchedUsers.length - 1].id}`;
      } else {
        nextCursor = `${searchedUsers[searchedUsers.length - 1].score}_${searchedUsers[searchedUsers.length - 1].id}`;
      }
    }

    return {
      nextCursor,
      users: returnUsers,
    };
  }
}

export type SearchUserInput = {
  userId: string | null;
  keyword: string;
  cursor: string | null;
  size: number;
  sort: 'popular' | 'accuracy';
};

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
  targetId: string;
};
