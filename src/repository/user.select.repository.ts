import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserSelectRepository {
  constructor(private prisma: PrismaService) {}

  async findOneByProviderOrThrow(provider: string, providerId: string) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
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
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        description: true,
        links: true,
        backgroundImage: true,
      },
    });

    if (!user) {
      throw new HttpException('USER', 404);
    }

    return user;
  }

  async getUserProfile(userId: string | null, targetUserId: string) {
    try {
      const select: Prisma.UserSelect = {
        id: true,
        name: true,
        image: true,
        backgroundImage: true,
        description: true,
        links: true,
        followerCount: true,
        _count: {
          select: {
            followings: true,
            feeds: true,
          },
        },
      };

      if (userId) {
        select.followers = {
          select: {
            followerId: true,
          },
          where: {
            followerId: userId,
          },
        };
      }
      return await this.prisma.user.findUniqueOrThrow({
        where: {
          id: targetUserId,
        },
        select,
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
    const where: Prisma.FollowWhereInput = {
      followingId: userId,
    };
    if (cursor) {
      where.followerId = {
        lt: cursor,
      };
    }
    return await this.prisma.follow.findMany({
      where,
      take: size,
      orderBy: {
        followerId: 'desc',
      },
      select: {
        follower: {
          select: {
            id: true,
            name: true,
            image: true,
            description: true,
          },
        },
      },
    });
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
    const where: Prisma.FollowWhereInput = {
      followerId: userId,
    };
    if (cursor) {
      where.followingId = {
        lt: cursor,
      };
    }
    return await this.prisma.follow.findMany({
      where,
      take: size,
      orderBy: {
        followingId: 'desc',
      },
      select: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            description: true,
          },
        },
      },
    });
  }

  async getPopularUsers(userId: string | null) {
    const select: Prisma.UserSelect = {
      id: true,
      name: true,
      image: true,
      followerCount: true,
      feeds: {
        select: {
          thumbnail: true,
        },
        take: 2,
      },
    };

    if (userId) {
      select.followers = {
        select: {
          followerId: true,
        },
        where: {
          followerId: userId,
        },
      };
    }
    return await this.prisma.user.findMany({
      take: 20,
      orderBy: {
        followerCount: 'desc',
      },
      select,
    });
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
}
