import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

export async function createTestUser(
  app: INestApplication,
  input: CreateTestUserInput,
) {
  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);

  const user = await prisma.user.create({
    data: {
      url: input.url ?? 'test',
      provider: input.provider ?? 'KAKAO',
      providerId: input.providerId ?? 'test',
      email: input.email ?? 'test@example.com',
      name: input.name ?? 'test',
      image: input.image ?? null,
      description: input.description ?? '',
      backgroundImage: input.backgroundImage ?? null,
      links: input.links ?? [],
      followerCount: input.followerCount ?? 0,
      subscription: input.subscription ?? [],
    },
  });
  const accessToken = jwtService.sign({
    id: user.id,
  });
  return { user, accessToken };
}

export interface CreateTestUserInput {
  url?: string;
  provider?: string;
  providerId?: string;
  email?: string;
  name?: string;
  image?: string;
  description?: string;
  backgroundImage?: string;
  links?: string[];
  followerCount?: number;
  subscription?: string[];
}
