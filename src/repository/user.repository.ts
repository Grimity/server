import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from 'src/provider/redis.service';

@Injectable()
export class UserRepository {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

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
        select: { id: true },
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
      where: { id: userId },
      data: { image: imageName },
      select: { id: true },
    });
    return;
  }

  async updateBackgroundImage(userId: string, imageName: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { backgroundImage: imageName },
      select: { id: true },
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
        select: { id: true },
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

  async follow(userId: string, targetUserId: string) {
    try {
      const [_, user] = await this.prisma.$transaction([
        this.prisma.follow.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
          select: { followingId: true },
        }),
        this.prisma.user.update({
          where: {
            id: targetUserId,
          },
          data: {
            followerCount: {
              increment: 1,
            },
          },
          select: {
            subscription: true,
          },
        }),
      ]);
      return user.subscription;
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
    try {
      await this.prisma.$transaction([
        this.prisma.follow.delete({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: targetUserId,
            },
          },
          select: { followerId: true },
        }),
        this.prisma.user.update({
          where: {
            id: targetUserId,
          },
          data: {
            followerCount: {
              decrement: 1,
            },
          },
          select: { id: true },
        }),
      ]);
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FOLLOW', 404);
        }
      }
      throw e;
    }
  }

  async updateSubscription(userId: string, subscription: string[]) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        subscription: {
          set: subscription,
        },
      },
      select: { id: true },
    });
  }

  async cachePopularUserIds(ids: string[]) {
    await this.redis.set('popularUserIds', JSON.stringify(ids), 'EX', 60 * 30);
    return;
  }

  async deleteOne(userId: string) {
    await this.prisma.user.delete({
      where: {
        id: userId,
      },
      select: { id: true },
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
