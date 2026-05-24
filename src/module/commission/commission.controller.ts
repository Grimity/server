import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorator';
import { JwtGuard } from 'src/core/guard';
import { VerifyIdentity422Response } from 'src/module/user/dto/identity-verification.error';
import { IdResponse } from 'src/shared/response/id.response';
import { CommissionService } from './commission.service';
import { CreateCommissionRequest } from './dto/commission.request';

@ApiTags('/commissions')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@UseGuards(JwtGuard)
@Controller('commissions')
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  @ApiOperation({
    summary: '커미션 등록 (본인인증 필요)',
    description:
      '본인인증이 완료된 유저만 등록 가능. 미인증 시 422 NOT_VERIFIED 반환.',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @ApiResponse({
    status: 422,
    type: VerifyIdentity422Response,
    description: 'NOT_VERIFIED — 본인인증 필요',
  })
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateCommissionRequest,
  ): Promise<IdResponse> {
    return this.service.create(userId, dto);
  }
}
