import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorator';
import { JwtGuard } from 'src/core/guard';
import { IdResponse } from 'src/shared/response/id.response';
import { CommissionWorkService } from './commission-work.service';
import {
  CreateCommissionWork400Response,
  CreateCommissionWork404Response,
} from './dto/commission-work.error';
import { CreateCommissionWorkRequest } from './dto/commission-work.request';

@ApiTags('/commission-works')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtGuard)
@Controller('commission-works')
export class CommissionWorkController {
  constructor(private readonly service: CommissionWorkService) {}

  @ApiOperation({
    summary: '커미션 신청',
    description:
      'commissionId가 있으면 FORM(폼) 신청, 없으면 DIRECT(직접 의뢰). 신청 시 CommissionWork와 CommissionRequest가 동시에 생성됨.',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @ApiResponse({ status: 400, type: CreateCommissionWork400Response })
  @ApiResponse({ status: 404, type: CreateCommissionWork404Response })
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateCommissionWorkRequest,
  ): Promise<IdResponse> {
    return this.service.create(userId, dto);
  }
}
