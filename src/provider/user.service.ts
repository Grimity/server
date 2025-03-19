import { HttpException, Injectable, Inject } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsService } from './aws.service';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { SearchService } from 'src/database/search/search.service';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { convertPostTypeFromNumber } from 'src/common/constants';
import { DdbService } from 'src/database/ddb/ddb.service';
import { RedisService } from 'src/database/redis/redis.service';
import { UpdateInput } from 'src/repository/user.repository';
import { separator } from 'src/common/constants/separator-text';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedSelectRepository: FeedSelectRepository,
    private awsService: AwsService,
    private userSelectRepository: UserSelectRepository,
    @Inject(SearchService) private searchService: SearchService,
    private postSelectRepository: PostSelectRepository,
    private ddb: DdbService,
    private redisService: RedisService,
  ) {}

  async updateProfileImage(userId: string, imageName: string | null) {
    await this.userRepository.update(userId, { image: imageName });
    return;
  }

  async updateBackgroundImage(userId: string, imageName: string | null) {
    await this.userRepository.update(userId, { backgroundImage: imageName });
    return;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const { links } = input;

    let transformedLinks: string[] = [];
    if (links.length > 0) {
      transformedLinks = links.map(({ linkName, link }) => {
        return linkName.trim() + separator + link.trim();
      });
    }

    const toUpdateInput: UpdateInput = {
      description: input.description,
      links: transformedLinks,
    };

    const [nameConflictUser, urlConflictUser] = await Promise.all([
      this.userSelectRepository.findOneByName(input.name),
      this.userSelectRepository.findOneByUrl(input.url),
    ]);

    if (nameConflictUser && nameConflictUser.id !== userId)
      throw new HttpException('NAME', 409);
    else toUpdateInput.name = input.name;

    if (urlConflictUser && urlConflictUser.id !== userId)
      throw new HttpException('URL', 409);
    else toUpdateInput.url = input.url;

    await this.userRepository.update(userId, toUpdateInput);
    await this.searchService.updateUser(userId, input.name, input.description);
    return;
  }

  async getMyProfile(userId: string) {
    const user = await this.userSelectRepository.getMyProfile(userId);

    return {
      id: user.id,
      url: user.url,
      provider: user.provider,
      email: user.email,
      name: user.name,
      image: user.image,
      description: user.description,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split(separator);
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
    const user = await this.userRepository.follow(userId, targetUserId);

    if (user.subscription.includes('FOLLOW')) {
      await Promise.all([
        this.awsService.pushEvent({
          type: 'FOLLOW',
          actorId: userId,
          userId: targetUserId,
        }),
        this.ddb.putItemForUpdate({
          type: 'USER',
          id: targetUserId,
          count: user.followerCount,
        }),
      ]);
    } else {
      await this.ddb.putItemForUpdate({
        type: 'USER',
        id: targetUserId,
        count: user.followerCount,
      });
    }

    return;
  }

  async unfollow(userId: string, targetUserId: string) {
    const user = await this.userRepository.unfollow(userId, targetUserId);
    await this.ddb.putItemForUpdate({
      type: 'USER',
      id: targetUserId,
      count: user.followerCount,
    });

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
      url: targetUser.url,
      backgroundImage: targetUser.backgroundImage,
      description: targetUser.description,
      links: targetUser.links.map((link) => {
        const [linkName, linkUrl] = link.split(separator);
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
        nextCursor =
          feeds[feeds.length - 1].createdAt.toISOString() +
          separator +
          feeds[feeds.length - 1].id;
      } else {
        nextCursor =
          feeds[feeds.length - 1].likeCount +
          separator +
          feeds[feeds.length - 1].id;
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
    let userIds = (await this.redisService.getArray('popularUserIds')) as
      | string[]
      | null;

    if (userIds === null) {
      userIds = await this.userSelectRepository.findPopularUserIds();
      await this.redisService.cacheArray('popularUserIds', userIds, 60 * 30);
    }

    return await this.userSelectRepository.findPopularUsersByIds(
      userId,
      userIds,
    );
  }

  async searchUsers(input: SearchUserInput) {
    const currentCursor = input.cursor ? Number(input.cursor) : 0;
    const { ids, totalCount } = await this.searchService.searchUser({
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
          url: user.url,
          description: user.description,
          backgroundImage: user.backgroundImage,
          followerCount: user.followerCount,
          isFollowing: user.isFollowing,
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
    await this.userRepository.update(userId, { subscription });
    return;
  }

  async getSubscription(userId: string) {
    const { subscription } =
      await this.userSelectRepository.findOneById(userId);
    return {
      subscription,
    };
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
        thumbnail: post.thumbnail,
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
          thumbnail: post.thumbnail,
          commentCount: post.commentCount,
          viewCount: post.viewCount,
          createdAt: post.createdAt,
          author: post.author,
        };
      }),
    };
  }

  async deleteMe(userId: string) {
    const [feedIds, postIds] = await Promise.all([
      this.feedSelectRepository.findAllIdsByUserId(userId),
      this.postSelectRepository.findAllIdsByUserId(userId),
    ]);
    await Promise.all([
      this.searchService.deleteAll({ userId, feedIds, postIds }),
      this.userRepository.deleteOne(userId),
    ]);
    return;
  }

  async getMeta(id: string) {
    const user = await this.userSelectRepository.findOneById(id);

    return {
      id: user.id,
      name: user.name,
      description: user.description,
      image: user.image,
      url: user.url,
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
  url: string;
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
