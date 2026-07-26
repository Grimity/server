import { INestApplication } from '@nestjs/common';
import {
  SwaggerModule,
  DocumentBuilder,
  OpenAPIObject,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/shared/response/error.response';

/**
 * 에러 응답은 컨트롤러에서 `@ApiResponse({ status: 404, description: '...' })`처럼
 * 스키마 없이 선언돼 있어서, 그대로 두면 생성된 클라이언트가 에러 바디를 void로 받는다.
 * GlobalFilter가 모든 에러를 ErrorResponse 형태로 내려주므로,
 * 스키마가 없는 4xx/5xx에만 공통 스키마를 채워 넣는다.
 * (이미 전용 스키마가 붙은 응답은 건드리지 않는다.)
 */
function fillErrorSchemas(document: OpenAPIObject) {
  const schema = { $ref: getSchemaPath(ErrorResponse) };

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      const responses = (operation as { responses?: Record<string, any> })
        ?.responses;
      if (!responses) continue;

      for (const [code, response] of Object.entries(responses)) {
        const isError = code === 'default' || Number(code) >= 400;
        if (!isError || response.content) continue;
        response.content = { 'application/json': { schema } };
      }
    }
  }
}

/**
 * operationId는 클라이언트 코드 생성기가 함수 이름을 만드는 근거라서,
 * 바뀌면 소비자 레포의 호출부가 전부 깨진다.
 * 기본값(`PostController_create`) 대신 Controller 접미사를 떼고 lowerCamel로 고정한다.
 *   PostController#create        -> post_create        -> postCreate()
 *   FeedCommentController#create -> feedComment_create -> feedCommentCreate()
 * 컨트롤러 클래스명은 전부 유일하므로 충돌하지 않는다.
 */
function operationIdFactory(controllerKey: string, methodKey: string) {
  const resource = controllerKey.replace(/Controller$/, '');
  return `${resource.charAt(0).toLowerCase()}${resource.slice(1)}_${methodKey}`;
}

/**
 * 런타임 Swagger UI와 코드 생성용 openapi.json이 같은 문서를 쓰도록 여기 한 군데서만 만든다.
 */
export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('grimity API')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory,
    extraModels: [ErrorResponse],
  });

  fillErrorSchemas(document);

  return document;
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('api', app, createSwaggerDocument(app));
}
