import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser, CreateTestUserInput } from './create-test-user';

export async function createVerifiedTestUser(
  app: INestApplication,
  input: CreateTestUserInput = {},
) {
  const { user, accessToken } = await createTestUser(app, input);
  const prisma = app.get(PrismaService);

  await prisma.identityVerification.create({
    data: {
      userId: user.id,
      identityVerificationId: `iv-${user.id}`,
      ci: `ci-${user.id}`,
      name: input.name ?? 'test',
      phoneNumber: '01012345678',
      birthDate: new Date('2000-01-14'),
      gender: 'MALE',
      isForeigner: false,
      pgProvider: 'INICIS_UNIFIED',
      pgTxId: `pg-${user.id}`,
    },
  });

  return { user, accessToken };
}
