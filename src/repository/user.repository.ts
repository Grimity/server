import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async create({ provider, providerId, email, name }: CreateInput) {
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

  async update(id: string, input: UpdateInput) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: input,
        select: { id: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') throw new HttpException('USER', 404);
        if (e.code === 'P2002') throw new HttpException('NAME', 409);
      }
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
            followerCount: true,
          },
        }),
      ]);
      return user;
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
      const [_, user] = await this.prisma.$transaction([
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
          select: { followerCount: true },
        }),
      ]);
      return user;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FOLLOW', 404);
        }
      }
      throw e;
    }
  }

  async deleteOne(userId: string) {
    await this.prisma.user.delete({
      where: {
        id: userId,
      },
      select: { id: true },
    });
  }

  async createRefreshToken(input: CreateRefTInput) {
    await this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        token: input.refreshToken,
        type: input.type,
        device: input.device,
        model: input.model,
        ip: input.ip,
      },
      select: { userId: true },
    });
    return;
  }

  async updateRefreshToken(
    userId: string,
    prevToken: string,
    newToken: string,
  ) {
    try {
      await this.prisma.refreshToken.update({
        where: {
          userId_token: {
            userId,
            token: prevToken,
          },
        },
        data: {
          token: newToken,
          updatedAt: new Date(),
        },
        select: { userId: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new HttpException('만료된 refT', 401);
      }
      throw e;
    }
  }

  async deleteRefreshToken(userId: string, token: string) {
    try {
      await this.prisma.refreshToken.delete({
        where: {
          userId_token: {
            userId,
            token,
          },
        },
        select: { userId: true },
      });
      return;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new HttpException('만료된 refT', 401);
      }
      throw e;
    }
  }
}

type CreateInput = {
  provider: string;
  providerId: string;
  email: string;
  name: string;
};

type UpdateInput = {
  name?: string;
  image?: string | null;
  description?: string;
  backgroundImage?: string | null;
  links?: string[];
  subscription?: string[];
};

type CreateRefTInput = {
  userId: string;
  refreshToken: string;
  type: 'WEB' | 'APP';
  device: string;
  model: string;
  ip: string;
};
