/**
 * OpenAPI 스펙을 파일로 추출한다.
 *
 * preview 모드로 띄우기 때문에 프로바이더가 인스턴스화되지 않는다.
 * = DB/Redis/Firebase 연결 없이, CI에서 인프라 없이 실행 가능하다.
 *
 *   npm run openapi          # openapi/openapi.json 갱신
 *   npm run openapi:check    # 스펙이 소스와 어긋나면 실패 (CI용)
 */
import { NestFactory } from '@nestjs/core';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { AppModule } from '../src/app.module';
import { createSwaggerDocument } from '../src/common/config/swagger.config';

async function main() {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });

  const document = createSwaggerDocument(app);

  const out = resolve(process.argv[2] ?? 'openapi/openapi.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(document, null, 2) + '\n');

  await app.close();
  console.log(`openapi: ${Object.keys(document.paths).length} paths -> ${out}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
