import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { ConfigService } from '@nestjs/config';
import { createCorsOptions } from './common/config/auth.config';

// 전역 에러 핸들러 추가
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Promise rejection으로 인한 서버 다운 방지
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(createCorsOptions(app.get(ConfigService)));

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
