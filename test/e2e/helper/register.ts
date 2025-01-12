import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export const register = async (app: INestApplication, name: string) => {
  const { body } = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      provider: 'KAKAO',
      providerAccessToken: 'test',
      name,
    });

  return body.accessToken as string;
};
