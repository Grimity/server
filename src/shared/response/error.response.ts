import { ApiProperty } from '@nestjs/swagger';

/**
 * GlobalFilter가 내려주는 공통 에러 바디.
 * 스펙상 스키마가 따로 지정되지 않은 4xx/5xx 응답에 자동으로 붙는다.
 * (src/core/filter/global.filter.ts, src/common/config/swagger.config.ts 참고)
 */
export class ErrorResponse {
  @ApiProperty()
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: '유효성 검사 실패 시 문자열 배열로 내려온다',
  })
  message: string | string[];

  @ApiProperty({ required: false })
  error?: string;
}
