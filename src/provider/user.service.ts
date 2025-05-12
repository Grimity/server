import { HttpException, Injectable, Inject } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsService } from './aws.service';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { SearchService } from 'src/database/search/search.service';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { convertPostTypeFromNumber } from 'src/common/constants';
import { RedisService } from 'src/database/redis/redis.service';
import { UpdateInput } from 'src/repository/user.repository';
import { separator } from 'src/common/constants/separator-text';
import { getImageUrl } from './util/get-image-url';
import { removeHtml } from './util/remove-html';
import { AlbumRepository } from 'src/repository/album.repository';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private feedSelectRepository: FeedSelectRepository,
    private awsService: AwsService,
    private userSelectRepository: UserSelectRepository,
    @Inject(SearchService) private searchService: SearchService,
    private postSelectRepository: PostSelectRepository,
    private redisService: RedisService,
    private albumRepository: AlbumRepository,
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
      image: getImageUrl(user.image),
      description: user.description,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split(separator);
        return {
          linkName,
          link: linkUrl,
        };
      }),
      backgroundImage: getImageUrl(user.backgroundImage),
      createdAt: user.createdAt,
      hasNotification: user.hasNotification,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
    };
  }

  async follow(userId: string, targetUserId: string) {
    const user = await this.userRepository.follow(userId, targetUserId);

    if (user.subscription.includes('FOLLOW')) {
      await this.awsService.pushEvent({
        type: 'FOLLOW',
        actorId: userId,
        userId: targetUserId,
      });
    }

    return;
  }

  async unfollow(userId: string, targetUserId: string) {
    await this.userRepository.unfollow(userId, targetUserId);

    return;
  }

  async getUserProfileByUrl(userId: string | null, url: string) {
    const targetUser = await this.userSelectRepository.findOneByUrl(url);

    if (targetUser === null) throw new HttpException('USER', 404);

    return await this.getUserProfileById(userId, targetUser.id);
  }

  async getUserProfileById(userId: string | null, targetUserId: string) {
    const [targetUser, albums] = await Promise.all([
      this.userSelectRepository.getUserProfile(userId, targetUserId),
      this.albumRepository.findManyWithCountByUserId(targetUserId),
    ]);

    return {
      id: targetUser.id,
      name: targetUser.name,
      image: getImageUrl(targetUser.image),
      url: targetUser.url,
      backgroundImage: getImageUrl(targetUser.backgroundImage),
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
      albums,
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
      followers: followers.map((follower) => ({
        ...follower,
        image: getImageUrl(follower.image),
      })),
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
      followings: followings.map((user) => ({
        ...user,
        image: getImageUrl(user.image),
      })),
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
      feeds: feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
      })),
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
      feeds: feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
      })),
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
      feeds: feeds.map((feed) => ({
        ...feed,
        thumbnail: getImageUrl(feed.thumbnail),
        author: {
          ...feed.author,
          image: getImageUrl(feed.author.image),
        },
      })),
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

    const users = await this.userSelectRepository.findPopularUsersByIds(
      userId,
      userIds,
    );

    return users.map((user) => ({
      ...user,
      image: getImageUrl(user.image),
      thumbnails: user.thumbnails.map((thumbnail) => getImageUrl(thumbnail)),
    }));
  }

  async searchUsers(input: SearchUserInput) {
    let nextCursor: string | null = null;

    const [users, totalCount] = await Promise.all([
      this.userSelectRepository.findManyByName({
        userId: input.userId,
        name: input.keyword,
        cursor: input.cursor,
        size: input.size,
      }),
      this.userSelectRepository.countByName(input.keyword),
    ]);

    if (users.length === input.size) {
      nextCursor =
        users[users.length - 1].followerCount +
        separator +
        users[users.length - 1].id;
    }

    return {
      totalCount,
      nextCursor,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        image: getImageUrl(user.image),
        url: user.url,
        description: user.description,
        backgroundImage: getImageUrl(user.backgroundImage),
        followerCount: user.followerCount,
        isFollowing: user.isFollowing,
      })),
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
        content: removeHtml(post.content).slice(0, 150),
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
          content: removeHtml(post.content).slice(0, 150),
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
      this.searchService.deleteAll({ feedIds, postIds }),
      this.userRepository.deleteOne(userId),
    ]);
    return;
  }

  async getMetaByUrl(url: string) {
    const user = await this.userSelectRepository.findOneByUrl(url);

    if (!user) throw new HttpException('USER', 404);

    return await this.getMetaById(user.id);
  }

  async getMetaById(id: string) {
    const user = await this.userSelectRepository.findOneById(id);

    return {
      id: user.id,
      name: user.name,
      description: user.description,
      image: getImageUrl(user.image),
      url: user.url,
    };
  }

  async getAlbumsByUserId(userId: string) {
    const albums = await this.albumRepository.findManyByUserId(userId);

    return albums.map((album) => ({
      id: album.id,
      name: album.name,
    }));
  }
}

export type SearchUserInput = {
  userId: string | null;
  keyword: string;
  cursor: string | null;
  size: number;
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
  albumId: string | null;
};
