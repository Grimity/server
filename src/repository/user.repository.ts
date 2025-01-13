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

  async updateImage(userId: string, filename: string | null) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        image: filename,
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
}

type UpdateProfileInput = {
  name: string;
  description: string;
  links: string[];
};
