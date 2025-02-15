import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsService } from './aws.service';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { OpenSearchService } from './opensearch.service';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { convertPostTypeFromNumber } from 'src/common/constants';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedSelectRepository: FeedSelectRepository,
    private awsService: AwsService,
    private userSelectRepository: UserSelectRepository,
    private openSearchService: OpenSearchService,
    private postSelectRepository: PostSelectRepository,
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
    const user = await this.userSelectRepository.getMyProfile(userId);

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
      hasNotification: user.hasNotification,
    };
  }

  async follow(userId: string, targetUserId: string) {
    const subscription = await this.userRepository.follow(userId, targetUserId);

    if (subscription.includes('FOLLOW')) {
      await Promise.all([
        this.awsService.pushEvent({
          type: 'FOLLOW',
          actorId: userId,
          userId: targetUserId,
        }),
        this.awsService.pushOpensearchQueue('USER', targetUserId),
      ]);
    } else {
      await this.awsService.pushOpensearchQueue('USER', targetUserId);
    }

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
      followingCount: targetUser.followingCount,
      feedCount: targetUser.feedCount,
      postCount: targetUser.postCount,
      isFollowing: targetUser.isFollowing,
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
        followers.length === size ? followers[followers.length - 1].id : null,
      followers,
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
          ? followings[followings.length - 1].id
          : null,
      followings,
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
      feeds,
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
      feeds,
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
      feeds,
    };
  }

  async getPopularUsers(userId: string | null) {
    let userIds = await this.userSelectRepository.getCachedPopularUserIds();

    if (userIds === null) {
      userIds = await this.userSelectRepository.findPopularUserIds();
      await this.userRepository.cachePopularUserIds(userIds);
    }

    return await this.userSelectRepository.findPopularUsersByIds(
      userId,
      userIds,
    );
  }

  async searchUsers(input: SearchUserInput) {
    const currentCursor = input.cursor ? Number(input.cursor) : 0;
    const { ids, totalCount } = await this.openSearchService.searchUser({
      keyword: input.keyword,
      cursor: currentCursor,
      size: input.size,
      sort: input.sort,
    });

    let nextCursor: string | null = null;

    if (ids.length === 0) {
      return {
        totalCount,
        nextCursor,
        users: [],
      };
    }

    const users = await this.userSelectRepository.findManyByUserIds(
      input.userId,
      ids,
    );

    const returnUsers = [];

    for (const searchedId of ids) {
      const user = users.find((user) => user.id === searchedId);
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

    if (ids.length === input.size) {
      nextCursor = String(currentCursor + 1);
    }

    return {
      totalCount,
      nextCursor,
      users: returnUsers,
    };
  }

  async updateSubscription(userId: string, subscription: string[]) {
    await this.userRepository.updateSubscription(userId, subscription);
    return;
  }

  async getSubscription(userId: string) {
    return await this.userSelectRepository.getSubscription(userId);
  }

  async getMyPosts({
    userId,
    page,
    size,
  }: {
    userId: string;
    page: number;
    size: number;
  }) {
    const posts = await this.postSelectRepository.findManyByUserId({
      userId,
      page,
      size,
    });

    return posts.map((post) => {
      return {
        id: post.id,
        type: convertPostTypeFromNumber(post.type),
        title: post.title,
        content: post.content,
        hasImage: post.hasImage,
        commentCount: post.commentCount,
        viewCount: post.viewCount,
        createdAt: post.createdAt,
      };
    });
  }

  async getMySavePosts({
    userId,
    size,
    page,
  }: {
    userId: string;
    size: number;
    page: number;
  }) {
    const [totalCount, posts] = await Promise.all([
      this.postSelectRepository.countSavedPosts(userId),
      this.postSelectRepository.findManySavedPosts({ userId, size, page }),
    ]);

    return {
      totalCount,
      posts: posts.map((post) => {
        return {
          id: post.id,
          type: convertPostTypeFromNumber(post.type),
          title: post.title,
          content: post.content,
          hasImage: post.hasImage,
          commentCount: post.commentCount,
          viewCount: post.viewCount,
          createdAt: post.createdAt,
          author: post.author,
        };
      }),
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
