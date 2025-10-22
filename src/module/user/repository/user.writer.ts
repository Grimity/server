import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class UserWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create({ provider, providerId, email, name, url }: CreateInput) {
    return await this.txHost.tx.user.create({
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
    await this.txHost.tx.user.update({
      where: { id },
      data: input,
      select: { id: true },
    });
    return;
  }

  async createFollow(userId: string, targetUserId: string) {
    try {
      await this.txHost.tx.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
        select: { followingId: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return null;
      }
      throw e;
    }
  }

  async deleteFollow(userId: string, targetUserId: string) {
    try {
      await this.txHost.tx.follow.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
        select: { followerId: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }
  }

  async increaseFollowerCount(userId: string) {
    return await this.txHost.tx.user.update({
      where: { id: userId },
      data: {
        followerCount: {
          increment: 1,
        },
      },
      select: { subscription: true },
    });
  }

  async decreaseFollowerCount(userId: string) {
    await this.txHost.tx.user.update({
      where: { id: userId },
      data: {
        followerCount: {
          decrement: 1,
        },
      },
    });
  }

  async deleteOne(userId: string) {
    await this.txHost.tx.user.delete({
      where: {
        id: userId,
      },
      select: { id: true },
    });
  }

  async createRefreshToken(input: CreateRefTInput) {
    await this.txHost.tx.refreshToken.create({
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
      return await this.txHost.tx.refreshToken.update({
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
      return await this.txHost.tx.refreshToken.delete({
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

  async upsertPushToken(input: {
    userId: string;
    deviceId: string;
    token: string;
  }) {
    await this.txHost.tx.pushToken.upsert({
      where: {
        userId_deviceId: {
          userId: input.userId,
          deviceId: input.deviceId,
        },
      },
      create: {
        userId: input.userId,
        deviceId: input.deviceId,
        token: input.token,
      },
      update: {
        token: input.token,
        updatedAt: new Date(),
      },
    });
    return;
  }
}

interface CreateInput {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  url: string;
}

export interface UpdateInput {
  url?: string;
  name?: string;
  image?: string | null;
  description?: string;
  backgroundImage?: string | null;
  links?: string[];
  subscription?: string[];
}

interface CreateRefTInput {
  userId: string;
  refreshToken: string;
  type: 'WEB' | 'APP';
  device: string;
  model: string;
  ip: string;
}
