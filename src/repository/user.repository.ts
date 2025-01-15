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
        _count: {
          select: {
            followers: true,
            followings: true,
          },
        },
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
        return;
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

  async getUserProfile(targetUserId: string) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: {
          id: targetUserId,
        },
        select: {
          id: true,
          name: true,
          image: true,
          description: true,
          links: true,
          email: true,
          _count: {
            select: {
              followers: true,
              followings: true,
              feeds: true,
            },
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

  async isFollowing(userId: string, targetUserId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });
    return !!follow;
  }

  async findMyFollowers(userId: string) {
    return (await this.prisma.$queryRaw`
      select
        u.id,
        u.name,
        u.image,
        cast((select count(*) from "Follow" where "followingId" = u.id) as integer) as "followerCount",
        exists (
          select 1
          from "Follow"
          where "followerId" = ${userId}::uuid and "followingId" = u.id
        ) as "isFollowing"
      from "User" u
      join "Follow" f on u.id = f."followerId"
      where f."followingId" = ${userId}::uuid;
    `) as MyFollower[];
  }

  async findFollowers(userId: string) {
    return await this.prisma.follow.findMany({
      where: {
        followingId: userId,
      },
      select: {
        follower: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: {
              select: {
                followers: true,
              },
            },
          },
        },
      },
    });
  }

  async findFollowings(userId: string) {
    return await this.prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      select: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: {
              select: {
                followers: true,
              },
            },
          },
        },
      },
    });
  }

  async findPopular() {
    return await this.prisma.user.findMany({
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: {
            followers: true,
            feeds: {
              where: {
                createdAt: {
                  gt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
                },
              },
            },
          },
        },
      },
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
