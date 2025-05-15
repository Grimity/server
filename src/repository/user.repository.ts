import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { convertCode } from './util/prisma-error-code';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async create({ provider, providerId, email, name, url }: CreateInput) {
    return await this.prisma.user.create({
      data: {
        provider,
        providerId,
        email,
        name,
        url,
      },
      select: { id: true },
    });
  }

  async update(id: string, input: UpdateInput) {
    await this.prisma.user.update({
      where: { id },
      data: input,
      select: { id: true },
    });
    return;
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
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return null;
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
        if (convertCode(e.code) === 'NOT_FOUND') return null;
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
      return await this.prisma.refreshToken.update({
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
        convertCode(e.code) === 'NOT_FOUND'
      ) {
        return null;
      }
      throw e;
    }
  }

  async deleteRefreshToken(userId: string, token: string) {
    try {
      return await this.prisma.refreshToken.delete({
        where: {
          userId_token: {
            userId,
            token,
          },
        },
        select: { userId: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        convertCode(e.code) === 'NOT_FOUND'
      ) {
        return null;
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
  url: string;
};

export type UpdateInput = {
  url?: string;
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
