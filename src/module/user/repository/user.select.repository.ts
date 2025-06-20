import { Injectable } from '@nestjs/common';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class UserSelectRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findOneById(id: string) {
    return await this.txHost.tx.user.findUnique({
      where: { id },
    });
  }

  async findOneByUrl(url: string) {
    return await this.txHost.tx.user.findUnique({
      where: { url },
      select: { id: true },
    });
  }

  async findOneByName(name: string) {
    return await this.txHost.tx.user.findUnique({
      where: { name },
      select: { id: true },
    });
  }

  async findOneByProvider(provider: string, providerId: string) {
    return await this.txHost.tx.user.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });
  }

  async getMyProfile(userId: string) {
    const response = await this.txHost.tx.$kysely
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

    if (response.length === 0) return null;
    const user = response[0];

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
    const response = await this.txHost.tx.$kysely
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

    if (response.length === 0) return null;
    const user = response[0];

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

  async findMyFollowersWithCursor(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const users = await this.txHost.tx.$kysely
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

    return {
      nextCursor: users.length === size ? `${users[size - 1].id}` : null,
      users,
    };
  }

  async findMyFollowingsWithCursor(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const users = await this.txHost.tx.$kysely
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

    return {
      nextCursor: users.length === size ? `${users[size - 1].id}` : null,
      users,
    };
  }

  async findPopularUserIds() {
    const users = await this.txHost.tx.user.findMany({
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
    const users = await this.txHost.tx.$kysely
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

  async findManyByNameWithCursor({
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
    const users = await this.txHost.tx.$kysely
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
        const [followerCount, id] = cursor!.split('_');
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

    return {
      nextCursor:
        users.length === size
          ? `${users[size - 1].followerCount}_${users[size - 1].id}`
          : null,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        url: user.url,
        image: user.image,
        description: user.description,
        backgroundImage: user.backgroundImage,
        followerCount: user.followerCount,
        isFollowing: user.isFollowing ?? false,
      })),
    };
  }

  async countByName(name: string) {
    return await this.txHost.tx.user.count({
      where: {
        name: {
          startsWith: name,
        },
      },
    });
  }

  async findRefreshToken(userId: string, token: string) {
    return await this.txHost.tx.refreshToken.findUnique({
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
