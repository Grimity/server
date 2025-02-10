import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

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

  async follow(userId: string, targetUserId: string) {
    try {
      const [_, user] = await this.prisma.$transaction([
        this.prisma.follow.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
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
    await this.prisma.$transaction([
      this.prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
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
      }),
    ]);

    return;
  }

  async subscribe(userId: string, type: string) {
    if (type === 'ALL') {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          subscription: {
            set: [
              'FOLLOW',
              'FEED_LIKE',
              'FEED_COMMENT',
              'FEED_REPLY',
              'POST_COMMENT',
              'POST_REPLY',
            ],
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          subscription: {
            push: type,
          },
        },
      });
    }
  }

  async unsubscribe(userId: string, type: string) {
    if (type === 'ALL') {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          subscription: {
            set: [],
          },
        },
      });
    } else {
      const { subscription } = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          subscription: true,
        },
      });

      const newSubscription = subscription.filter(
        (subscriptionType) => subscriptionType !== type,
      );

      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          subscription: {
            set: newSubscription,
          },
        },
      });
    }
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
