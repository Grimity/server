import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
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

  @ApiOperation({
    summary: '커미션 수정 (전체 덮어쓰기)',
    description:
      '본인 소유 커미션을 전체 덮어쓰기로 수정. tags/questions/images/isPublic 모두 body 값으로 교체됨. 미존재/타인 소유/삭제된 커미션이면 404.',
  })
  @ApiResponse({ status: 204, description: '수정 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 404, description: '커미션 없음' })
  @HttpCode(204)
  @Put(':id')
  async update(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) commissionId: string,
    @Body() dto: CreateCommissionRequest,
  ): Promise<void> {
    await this.service.update(userId, commissionId, dto);
  }

  @ApiOperation({
    summary: '커미션 삭제 (soft delete)',
    description:
      '본인 소유 커미션을 삭제 처리(deletedAt 세팅). 진행 중인 거래는 보존됨. 미존재/타인 소유/이미 삭제된 커미션이면 404.',
  })
  @ApiResponse({ status: 204, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '커미션 없음' })
  @HttpCode(204)
  @Delete(':id')
  async delete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) commissionId: string,
  ): Promise<void> {
    await this.service.delete(userId, commissionId);
  }
}
