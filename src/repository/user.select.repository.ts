import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from './util';
import { separator } from 'src/common/constants/separator-text';

@Injectable()
export class UserSelectRepository {
  constructor(private prisma: PrismaService) {}

  async findOneById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (user === null) throw new HttpException('USER', 404);
    return user;
  }

  async findOneByUrl(url: string) {
    return await this.prisma.user.findUnique({
      where: { url },
      select: { id: true },
    });
  }

  async findOneByName(name: string) {
    return await this.prisma.user.findUnique({
      where: { name },
      select: { id: true },
    });
  }

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
        'url',
        'followerCount',
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
      .select((eb) =>
        eb
          .selectFrom('Follow')
          .whereRef('Follow.followerId', '=', 'User.id')
          .select((eb) =>
            eb.fn.count<bigint>('Follow.followerId').as('followingCount'),
          )
          .as('followingCount'),
      )
      .execute();

    if (!user) throw new HttpException('USER', 404);

    return {
      id: user.id,
      url: user.url,
      provider: user.provider,
      email: user.email,
      name: user.name,
      image: user.image,
      description: user.description,
      links: user.links ?? [],
      backgroundImage: user.backgroundImage,
      createdAt: user.createdAt,
      hasNotification: user.hasNotification,
      followerCount: user.followerCount,
      followingCount:
        user.followingCount !== null ? Number(user.followingCount) : 0,
    };
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
        'url',
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
      url: user.url,
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
      .select(['id', 'name', 'User.image', 'description', 'url'])
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
      .select(['id', 'name', 'User.image', 'description', 'url'])
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
      .select([
        'User.id',
        'name',
        'User.image',
        'followerCount',
        'description',
        'url',
      ])
      .select((eb) =>
        eb
          .selectFrom((eb) =>
            eb
              .selectFrom('Feed')
              .select('thumbnail')
              .whereRef('Feed.authorId', '=', 'User.id')
              .limit(2)
              .as('Feed'),
          )
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['Feed.thumbnail']).as('thumbnail'),
          )
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
      url: user.url,
      followerCount: user.followerCount,
      description: user.description,
      thumbnails: user.thumbnails ?? [],
      isFollowing: user.isFollowing ?? false,
    }));
  }

  async findManyByName({
    userId,
    name,
    cursor,
    size,
  }: {
    userId: string | null;
    name: string;
    cursor: string | null;
    size: number;
  }) {
    const users = await this.prisma.$kysely
      .selectFrom('User')
      .where('name', 'like', `${name}%`)
      .select([
        'User.id',
        'name',
        'User.image',
        'description',
        'backgroundImage',
        'followerCount',
        'url',
      ])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Follow')
                .whereRef('Follow.followingId', '=', 'User.id')
                .where('followerId', '=', kyselyUuid(userId!)),
            ])
            .as('isFollowing'),
        ]),
      )
      .orderBy('User.followerCount', 'desc')
      .orderBy('User.id', 'desc')
      .limit(size)
      .$if(cursor !== null, (eb) => {
        const [followerCount, id] = cursor!.split(separator);
        return eb.where((eb) =>
          eb.or([
            eb('User.followerCount', '<', Number(followerCount)),
            eb.and([
              eb('User.followerCount', '=', Number(followerCount)),
              eb('User.id', '<', kyselyUuid(id)),
            ]),
          ]),
        );
      })
      .execute();

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      url: user.url,
      image: user.image,
      description: user.description,
      backgroundImage: user.backgroundImage,
      followerCount: user.followerCount,
      isFollowing: user.isFollowing ?? false,
    }));
  }

  async countByName(name: string) {
    return await this.prisma.user.count({
      where: {
        name: {
          startsWith: name,
        },
      },
    });
  }

  async findRefreshToken(userId: string, token: string) {
    return await this.prisma.refreshToken.findUnique({
      where: {
        userId_token: {
          userId,
          token,
        },
      },
      select: {
        userId: true,
      },
    });
  }
}
