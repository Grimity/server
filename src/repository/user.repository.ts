import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
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

  async create({
    provider,
    providerId,
    email,
    name,
  }: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
  }) {
    try {
      return await this.prisma.user.create({
        data: {
          provider,
          providerId,
          email,
          name,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        if (Array.isArray(e.meta?.target) && e.meta.target.includes('name')) {
          throw new HttpException('NAME', 409);
        }
        throw new HttpException('USER', 409);
      }
      throw e;
    }
  }

  async updateImage(userId: string, imageName: string | null) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        image: imageName,
      },
    });
    return;
  }

  async updateBackgroundImage(userId: string, imageName: string | null) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        backgroundImage: imageName,
      },
    });
    return;
  }

  async updateProfile(userId: string, updateProfileInput: UpdateProfileInput) {
    try {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          name: updateProfileInput.name,
          description: updateProfileInput.description,
          links: updateProfileInput.links,
        },
      });
      return;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new HttpException('NAME', 409);
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

  async follow(userId: string, targetUserId: string) {
    try {
      await this.prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
      });
      return;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new HttpException('이미 팔로우한 유저', 409);
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new HttpException('없는 유저', 404);
      }
      throw e;
    }
  }

  async unfollow(userId: string, targetUserId: string) {
    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });
    return;
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
        _count: {
          select: {
            followers: true,
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
      _count: {
        select: {
          followers: true,
        },
      },
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
        followers: {
          _count: 'desc',
        },
      },
      select,
    });
  }
}

type UpdateProfileInput = {
  name: string;
  description: string;
  links: string[];
};

export type MyFollower = {
  id: string;
  name: string;
  image: string | null;
  followerCount: number;
  isFollowing: boolean;
};
