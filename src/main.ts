import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { RedisIoAdapter } from './database/redis/redis.adapter';
import { RedisService } from './database/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);

  const redisService = app.get(RedisService);

  const redisIoAdapter = new RedisIoAdapter(redisService, app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
}
bootstrap();
