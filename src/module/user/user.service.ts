import { HttpException, Injectable } from '@nestjs/common';
import { UserWriter, UpdateInput } from './repository/user.writer';
import { FeedReader } from '../feed/repository/feed.reader';
import { UserReader } from './repository/user.reader';
import { PostReader } from '../post/repository/post.reader';
import { convertPostType } from 'src/shared/util/convert-post-type';
import { RedisService } from 'src/database/redis/redis.service';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { removeHtml } from 'src/shared/util/remove-html';
import { AlbumReader } from '../album/repository/album.reader';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { Transactional } from '@nestjs-cls/transactional';
import { PortOneService } from 'src/infrastructure/portone/portone.service';
import { CustomException } from 'src/core/exception';
import { IdentityVerificationErrorCode } from './dto/identity-verification.error';
import { CommissionNoticeReader } from '../commission-notice/repository/commission-notice.reader';
import { CommissionNoticeWriter } from '../commission-notice/repository/commission-notice.writer';
import { UpsertCommissionNoticeRequest } from './dto/user.request';
import { CommissionNoticeResponse } from './dto/user.response';

const linkSeparator = '|~|';

@Injectable()
export class UserService {
  constructor(
    private userWriter: UserWriter,
    private feedReader: FeedReader,
    private userReader: UserReader,
    private postReader: PostReader,
    private redisService: RedisService,
    private albumReader: AlbumReader,
    private eventEmitter: TypedEventEmitter,
    private portoneService: PortOneService,
    private commissionNoticeReader: CommissionNoticeReader,
    private commissionNoticeWriter: CommissionNoticeWriter,
  ) {}

  async updateProfileImage(userId: string, imageName: string | null) {
    await this.userWriter.update(userId, { image: imageName });
    return;
  }

  async updateBackgroundImage(userId: string, imageName: string | null) {
    await this.userWriter.update(userId, { backgroundImage: imageName });
    return;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const { links } = input;

    let transformedLinks: string[] = [];
    if (links.length > 0) {
      transformedLinks = links.map(({ linkName, link }) => {
        return linkName.trim() + linkSeparator + link.trim();
      });
    }

    const toUpdateInput: UpdateInput = {
      description: input.description,
      links: transformedLinks,
    };

    const [nameConflictUser, urlConflictUser] = await Promise.all([
      this.userReader.findOneByName(input.name),
      this.userReader.findOneByUrl(input.url),
    ]);

    if (nameConflictUser && nameConflictUser.id !== userId)
      throw new HttpException('NAME', 409);
    else toUpdateInput.name = input.name;

    if (urlConflictUser && urlConflictUser.id !== userId)
      throw new HttpException('URL', 409);
    else toUpdateInput.url = input.url;

    await this.userWriter.update(userId, toUpdateInput);
    return;
  }

  async getMyProfile(userId: string) {
    const user = await this.userReader.getMyProfile(userId);

    if (user === null) throw new HttpException('USER', 404);

    return {
      id: user.id,
      url: user.url,
      provider: user.provider,
      email: user.email,
      name: user.name,
      image: getImageUrl(user.image),
      description: user.description,
      links: user.links.map((link) => {
        const [linkName, linkUrl] = link.split(linkSeparator);
        return {
          linkName,
          link: linkUrl,
        };
      }),
      backgroundImage: getImageUrl(user.backgroundImage),
      createdAt: user.createdAt,
      hasNotification: user.hasNotification,
      hasUnreadChatMessage: user.hasUnreadChatMessage,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      isVerified: user.isVerified,
    };
  }

  async follow(userId: string, targetUserId: string) {
    const user = await this.userReader.findOneById(targetUserId);

    if (!user) throw new HttpException('USER', 404);

    const targetUser = await this.followTransaction(userId, targetUserId);

    if (targetUser.subscription.includes('FOLLOW')) {
      this.eventEmitter.emit('notification:FOLLOW', {
        actorId: userId,
        userId: targetUserId,
      });
    }

    return;
  }

  @Transactional()
  async followTransaction(userId: string, targetUserId: string) {
    const [_, user] = await Promise.all([
      this.userWriter.createFollow(userId, targetUserId),
      this.userWriter.increaseFollowerCount(targetUserId),
    ]);

    return user;
  }

  @Transactional()
  async unfollowTransaction(userId: string, targetUserId: string) {
    await Promise.all([
      this.userWriter.deleteFollow(userId, targetUserId),
      this.userWriter.decreaseFollowerCount(targetUserId),
    ]);

    return;
  }

  @Transactional()
  async block(userId: string, targetUserId: string) {
    await this.userWriter.createBlock(userId, targetUserId);
    await this.userWriter.deleteFollowerAndFollowing(userId, targetUserId);
    return;
  }

  async unblock(userId: string, targetUserId: string) {
    await this.userWriter.deleteBlock(userId, targetUserId);
    return;
  }

  async getUserProfileByUrl(userId: string | null, url: string) {
    const targetUser = await this.userReader.findOneByUrl(url);

    if (targetUser === null) throw new HttpException('USER', 404);

    return await this.getUserProfileById(userId, targetUser.id);
  }

  async getUserProfileById(userId: string | null, targetUserId: string) {
    const [targetUser, albums] = await Promise.all([
      this.userReader.getUserProfile(userId, targetUserId),
      this.albumReader.findManyWithCountByUserId(targetUserId),
    ]);

    if (targetUser === null) throw new HttpException('USER', 404);

    return {
      id: targetUser.id,
      name: targetUser.name,
      image: getImageUrl(targetUser.image),
      url: targetUser.url,
      backgroundImage: getImageUrl(targetUser.backgroundImage),
      description: targetUser.description,
      links: targetUser.links.map((link) => {
        const [linkName, linkUrl] = link.split(linkSeparator);
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
      isBlocking: targetUser.isBlocking,
      isBlocked: targetUser.isBlocked,
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
    const result = await this.userReader.findMyFollowersWithCursor(userId, {
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      followers: result.users.map((user) => ({
        ...user,
        image: getImageUrl(user.image),
      })),
    };
  }

  async getMyFollowings(
    userId: string,
    {
      keyword,
      cursor,
      size,
    }: {
      keyword: string | null;
      cursor: string | null;
      size: number;
    },
  ) {
    const result = await this.userReader.findMyFollowingsWithCursor(userId, {
      keyword,
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      followings: result.users.map((user) => ({
        ...user,
        image: getImageUrl(user.image),
      })),
    };
  }

  async getMyBlockings(userId: string) {
    const users = await this.userReader.findMyBlockings(userId);
    return {
      users: users.map((user) => ({
        ...user,
        image: getImageUrl(user.image),
      })),
    };
  }

  async getFeedsByUser(input: GetFeedsInput) {
    const result = await this.feedReader.findManyByUserIdWithCursor(input);

    return {
      nextCursor: result.nextCursor,
      feeds: result.feeds.map((feed) => ({
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
    const result = await this.feedReader.findMyLikeFeedsWithCursor(userId, {
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      feeds: result.feeds.map((feed) => ({
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
    const result = await this.feedReader.findMySaveFeedsWithCursor(userId, {
      cursor,
      size,
    });

    return {
      nextCursor: result.nextCursor,
      feeds: result.feeds.map((feed) => ({
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
      userIds = await this.userReader.findPopularUserIds();
      await this.redisService.cacheArray('popularUserIds', userIds, 60 * 30);
    }

    const users = await this.userReader.findPopularUsersByIds(userId, userIds);

    return users.map((user) => ({
      ...user,
      image: getImageUrl(user.image),
      thumbnails: user.thumbnails.map((thumbnail) => getImageUrl(thumbnail)),
    }));
  }

  async searchUsers(input: SearchUserInput) {
    const [result, totalCount] = await Promise.all([
      this.userReader.findManyByNameWithCursor({
        userId: input.userId,
        name: input.keyword,
        cursor: input.cursor,
        size: input.size,
      }),
      this.userReader.countByName(input.keyword),
    ]);

    return {
      totalCount,
      nextCursor: result.nextCursor,
      users: result.users.map((user) => ({
        id: user.id,
        name: user.name,
        image: getImageUrl(user.image),
        url: user.url,
        description: user.description,
        backgroundImage: getImageUrl(user.backgroundImage),
        followerCount: user.followerCount,
        isFollowing: user.isFollowing,
        isBlocking: user.isBlocking,
        isBlocked: user.isBlocked,
      })),
    };
  }

  async updateSubscription(userId: string, subscription: string[]) {
    await this.userWriter.update(userId, { subscription });
    return;
  }

  async getSubscription(userId: string) {
    const user = await this.userReader.findOneById(userId);
    if (user === null) throw new HttpException('USER', 404);
    return {
      subscription: user.subscription,
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
    const posts = await this.postReader.findManyByUserId({
      userId,
      page,
      size,
    });

    return posts.map((post) => {
      return {
        id: post.id,
        type: convertPostType(post.type),
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
      this.postReader.countSavedPosts(userId),
      this.postReader.findManySavedPosts({ userId, size, page }),
    ]);

    return {
      totalCount,
      posts: posts.map((post) => {
        return {
          id: post.id,
          type: convertPostType(post.type),
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
      this.feedReader.findAllIdsByUserId(userId),
      this.postReader.findAllIdsByUserId(userId),
    ]);

    await this.userWriter.deleteOne(userId);

    return;
  }

  async getMetaByUrl(url: string) {
    const user = await this.userReader.findOneByUrl(url);

    if (!user) throw new HttpException('USER', 404);

    return await this.getMetaById(user.id);
  }

  async getMetaById(id: string) {
    const user = await this.userReader.findOneById(id);

    if (!user) throw new HttpException('USER', 404);

    return {
      id: user.id,
      name: user.name,
      description: user.description,
      image: getImageUrl(user.image),
      url: user.url,
    };
  }

  async getAlbumsByUserId(userId: string) {
    const albums = await this.albumReader.findManyByUserId(userId);

    return albums.map((album) => ({
      id: album.id,
      name: album.name,
    }));
  }

  async checkNameOrThrow(name: string) {
    const user = await this.userReader.findOneByName(name);
    if (user !== null) {
      throw new HttpException('NAME', 409);
    }
    return true;
  }

  async registerPushToken(input: {
    userId: string;
    deviceId: string;
    token: string;
  }) {
    await this.userWriter.upsertPushToken(input);
    return;
  }

  async verifyIdentity(userId: string, identityVerificationId: string) {
    const verification = await this.portoneService.getIdentityVerification(
      identityVerificationId,
    );

    if (verification.status !== 'VERIFIED') {
      throw new CustomException(422, {
        errorCode: IdentityVerificationErrorCode.NOT_VERIFIED,
      });
    }

    const customer = verification.verifiedCustomer;
    if (!customer.ci) {
      throw new CustomException(422, {
        errorCode: IdentityVerificationErrorCode.CI_NOT_PROVIDED,
      });
    }
    if (!customer.name || !customer.phoneNumber || !customer.birthDate) {
      throw new CustomException(422, {
        errorCode: IdentityVerificationErrorCode.INCOMPLETE_VERIFIED_CUSTOMER,
      });
    }

    const existing =
      await this.userReader.findIdentityVerificationByUserId(userId);
    if (existing && existing.ci !== customer.ci) {
      throw new CustomException(409, {
        errorCode: IdentityVerificationErrorCode.CI_MISMATCH,
      });
    }

    const result = await this.userWriter.upsertIdentityVerification(userId, {
      identityVerificationId: verification.id,
      ci: customer.ci,
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      birthDate: new Date(customer.birthDate),
      gender: customer.gender ?? '',
      isForeigner: customer.isForeigner ?? false,
      pgProvider: verification.channel?.pgProvider ?? '',
      pgTxId: verification.pgTxId,
    });

    if (result.conflict !== null) {
      throw new CustomException(409, {
        errorCode: IdentityVerificationErrorCode[result.conflict],
      });
    }
    return;
  }

  async getMyIdentityVerification(userId: string) {
    const record =
      await this.userReader.findIdentityVerificationByUserId(userId);
    if (record === null) {
      return { isVerified: false, name: null, birthDate: null };
    }
    return {
      isVerified: true,
      name: record.name,
      birthDate: record.birthDate.toISOString().slice(0, 10),
    };
  }

  async upsertCommissionNotice(
    userId: string,
    dto: UpsertCommissionNoticeRequest,
  ): Promise<CommissionNoticeResponse> {
    const verified =
      await this.userReader.findIdentityVerificationByUserId(userId);
    if (!verified) {
      throw new CustomException(422, {
        errorCode: IdentityVerificationErrorCode.NOT_VERIFIED,
      });
    }
    const notice = await this.commissionNoticeWriter.upsertOne(userId, {
      title: dto.title,
      content: dto.content,
    });
    return { notice };
  }

  async findCommissionNoticeByUserId(
    userId: string,
  ): Promise<CommissionNoticeResponse> {
    const notice = await this.commissionNoticeReader.findByUserId(userId);
    return { notice };
  }

  async deleteCommissionNotice(userId: string): Promise<void> {
    await this.commissionNoticeWriter.deleteOne(userId);
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
