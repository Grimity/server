import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from 'src/provider/redis.service';
import { kyselyUuid } from './util';

@Injectable()
export class UserSelectRepository {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findOneByProviderOrThrow(provider: string, providerId: string) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
        },
        select: {
          id: true,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new HttpException('USER', 404);
      }
      throw e;
    }
  }

  async getMyProfile(userId: string) {
    const [user] = await this.prisma.$kysely
      .selectFrom('User')
      .where('id', '=', kyselyUuid(userId))
      .select([
        'id',
        'provider',
        'email',
        'name',
        'image',
        'createdAt',
        'description',
        'links',
        'backgroundImage',
      ])
      .select((eb) =>
        eb
          .fn<boolean>('EXISTS', [
            eb
              .selectFrom('Notification')
              .where('Notification.userId', '=', kyselyUuid(userId))
              .where('isRead', '=', false),
          ])
          .as('hasNotification'),
      )
      .execute();

    if (!user) throw new HttpException('USER', 404);

    return user;
  }

  async getUserProfile(userId: string | null, targetUserId: string) {
    const [user] = await this.prisma.$kysely
      .selectFrom('User')
      .where('User.id', '=', kyselyUuid(targetUserId))
      .select([
        'User.id',
        'name',
        'User.image',
        'backgroundImage',
        'description',
        'links',
        'followerCount',
      ])
      .select((eb) =>
        eb
          .selectFrom('Feed')
          .whereRef('Feed.authorId', '=', 'User.id')
          .select((eb) => eb.fn.count<bigint>('Feed.id').as('feedCount'))
          .as('feedCount'),
      )
      .select((eb) =>
        eb
          .selectFrom('Post')
          .whereRef('Post.authorId', '=', 'User.id')
          .select((eb) => eb.fn.count<bigint>('Post.id').as('postCount'))
          .as('postCount'),
      )
      .$if(userId === targetUserId, (eb) =>
        eb.select((eb) =>
          eb
            .selectFrom('Follow')
            .whereRef('Follow.followerId', '=', 'User.id')
            .select((eb) =>
              eb.fn.count<bigint>('Follow.followerId').as('followingCount'),
            )
            .as('followingCount'),
        ),
      )
      .$if(userId !== null && userId !== targetUserId, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Follow')
                .whereRef('Follow.followingId', '=', 'User.id')
                .where('Follow.followerId', '=', kyselyUuid(userId!)),
            ])
            .as('isFollowing'),
        ]),
      )
      .execute();

    if (!user) throw new HttpException('USER', 404);

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      backgroundImage: user.backgroundImage,
      description: user.description,
      links: user.links ?? [],
      followerCount: user.followerCount,
      followingCount:
        user.followingCount !== null && user.followingCount !== undefined
          ? Number(user.followingCount)
          : 0,
      feedCount: user.feedCount !== null ? Number(user.feedCount) : 0,
      postCount: user.postCount !== null ? Number(user.postCount) : 0,
      isFollowing: user.isFollowing ?? false,
    };
  }

  async findMyFollowers(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    return await this.prisma.$kysely
      .selectFrom('Follow')
      .where('followingId', '=', kyselyUuid(userId))
      .innerJoin('User', 'followerId', 'id')
      .select(['id', 'name', 'User.image', 'description'])
      .orderBy('followerId', 'desc')
      .limit(size)
      .$if(cursor !== null, (eb) =>
        eb.where('followerId', '<', kyselyUuid(cursor!)),
      )
      .execute();
  }

  async findMyFollowings(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    return await this.prisma.$kysely
      .selectFrom('Follow')
      .where('followerId', '=', kyselyUuid(userId))
      .innerJoin('User', 'followingId', 'id')
      .select(['id', 'name', 'User.image', 'description'])
      .orderBy('followingId', 'asc')
      .limit(size)
      .$if(cursor !== null, (eb) =>
        eb.where('followingId', '>', kyselyUuid(cursor!)),
      )
      .execute();
  }

  async findPopularUserIds() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
      },
      orderBy: {
        followerCount: 'desc',
      },
      take: 20,
    });
    return users.map((user) => user.id);
  }

  async findPopularUsersByIds(userId: string | null, userIds: string[]) {
    const users = await this.prisma.$kysely
      .selectFrom('User')
      .where('User.id', 'in', userIds.map(kyselyUuid))
      .select(['User.id', 'name', 'User.image', 'followerCount', 'description'])
      .select((eb) =>
        eb
          .selectFrom('Feed')
          .whereRef('Feed.authorId', '=', 'User.id')
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['thumbnail']).as('thumbnail'),
          )
          .limit(2)
          .as('thumbnails'),
      )
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Follow')
                .whereRef('Follow.followingId', '=', 'User.id')
                .where('Follow.followerId', '=', kyselyUuid(userId!)),
            ])
            .as('isFollowing'),
        ]),
      )
      .execute();

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      followerCount: user.followerCount,
      description: user.description,
      thumbnails: user.thumbnails ?? [],
      isFollowing: user.isFollowing ?? false,
    }));
  }

  async getCachedPopularUserIds() {
    const result = await this.redis.get('popularUserIds');
    if (result === null) return null;
    return JSON.parse(result) as string[];
  }

  async findManyByUserIds(myId: string | null, userIds: string[]) {
    const select: Prisma.UserSelect = {
      id: true,
      name: true,
      image: true,
      backgroundImage: true,
      description: true,
      followerCount: true,
    };

    if (myId) {
      select.followers = {
        select: {
          followerId: true,
        },
        where: {
          followerId: myId,
        },
      };
    }

    return await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select,
    });
  }

  async getSubscription(userId: string) {
    return await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        subscription: true,
      },
    });
  }
}
