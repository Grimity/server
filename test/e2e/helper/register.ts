import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export const register = async (app: INestApplication, name: string) => {
  const { body } = await request(app.getHttpServer())
    .post('/auth/register')
    .set(
      'User-Agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    )
    .send({
      provider: 'KAKAO',
      providerAccessToken: 'test',
      name,
    });

  return body.accessToken as string;
};
