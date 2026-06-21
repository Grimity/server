import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { IdResponse } from 'src/shared/response/id.response';
import { CommissionWorkService } from './commission-work.service';
import {
  AcceptCommissionWork403Response,
  AcceptCommissionWork404Response,
  AcceptCommissionWork409Response,
  CancelCommissionWork403Response,
  CancelCommissionWork404Response,
  CancelCommissionWork409Response,
  CompleteCommissionWork403Response,
  CompleteCommissionWork404Response,
  CompleteCommissionWork409Response,
  CreateCommissionReview403Response,
  CreateCommissionReview404Response,
  CreateCommissionReview409Response,
  CreateCommissionWork400Response,
  CreateCommissionWork404Response,
  CreateCommissionWorkMemo403Response,
  CreateCommissionWorkMemo404Response,
  RejectCommissionWork403Response,
  RejectCommissionWork404Response,
  RejectCommissionWork409Response,
  UploadCommissionWorkResult403Response,
  UploadCommissionWorkResult404Response,
  UploadCommissionWorkResult409Response,
} from './dto/commission-work.error';
import {
  CreateCommissionReviewRequest,
  CreateCommissionWorkMemoRequest,
  CreateCommissionWorkRequest,
  RejectCommissionWorkRequest,
  UploadCommissionWorkResultRequest,
} from './dto/commission-work.request';

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

  @ApiOperation({
    summary: '커미션 수락',
    description:
      '작가가 받은 PENDING 상태의 신청을 수락. ACCEPTED 상태로 전환.',
  })
  @ApiResponse({ status: 200, type: IdResponse })
  @ApiResponse({ status: 403, type: AcceptCommissionWork403Response })
  @ApiResponse({ status: 404, type: AcceptCommissionWork404Response })
  @ApiResponse({ status: 409, type: AcceptCommissionWork409Response })
  @Patch(':id/accept')
  async accept(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
  ): Promise<IdResponse> {
    return this.service.accept(userId, workId);
  }

  @ApiOperation({
    summary: '커미션 신청 취소',
    description:
      '신청자(의뢰인)가 본인이 보낸 PENDING 상태의 신청을 취소. CANCELED 상태로 전환. 작가가 이미 수락/거절했으면 409.',
  })
  @ApiResponse({ status: 200, type: IdResponse })
  @ApiResponse({ status: 403, type: CancelCommissionWork403Response })
  @ApiResponse({ status: 404, type: CancelCommissionWork404Response })
  @ApiResponse({ status: 409, type: CancelCommissionWork409Response })
  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
  ): Promise<IdResponse> {
    return this.service.cancel(userId, workId);
  }

  @ApiOperation({
    summary: '커미션 작업 완료',
    description:
      '신청자(의뢰인)가 작업을 완료 처리. ACCEPTED/IN_PROGRESS/FINAL 상태에서 COMPLETED로 전환.',
  })
  @ApiResponse({ status: 200, type: IdResponse })
  @ApiResponse({ status: 403, type: CompleteCommissionWork403Response })
  @ApiResponse({ status: 404, type: CompleteCommissionWork404Response })
  @ApiResponse({ status: 409, type: CompleteCommissionWork409Response })
  @Patch(':id/complete')
  async complete(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
  ): Promise<IdResponse> {
    return this.service.complete(userId, workId);
  }

  @ApiOperation({
    summary: '커미션 거절',
    description: '작가가 받은 PENDING 상태의 신청을 거절. 거절 사유는 선택.',
  })
  @ApiResponse({ status: 200, type: IdResponse })
  @ApiResponse({ status: 403, type: RejectCommissionWork403Response })
  @ApiResponse({ status: 404, type: RejectCommissionWork404Response })
  @ApiResponse({ status: 409, type: RejectCommissionWork409Response })
  @Patch(':id/reject')
  async reject(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
    @Body() dto: RejectCommissionWorkRequest,
  ): Promise<IdResponse> {
    return this.service.reject(userId, workId, dto.reason ?? null);
  }

  @ApiOperation({
    summary: '작업물 업로드 (덮어쓰기)',
    description:
      '작가가 작업물 이미지를 업로드. 기존 작업물 전체를 덮어씀. 작업물이 있으면 IN_PROGRESS, 최종 체크 시 FINAL로 전환. 종료 상태(REJECTED/CANCELED/COMPLETED)면 409.',
  })
  @ApiResponse({ status: 200, type: IdResponse })
  @ApiResponse({ status: 403, type: UploadCommissionWorkResult403Response })
  @ApiResponse({ status: 404, type: UploadCommissionWorkResult404Response })
  @ApiResponse({ status: 409, type: UploadCommissionWorkResult409Response })
  @Put(':id/result')
  async uploadResult(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
    @Body() dto: UploadCommissionWorkResultRequest,
  ): Promise<IdResponse> {
    return this.service.uploadResult(userId, workId, dto);
  }

  @ApiOperation({
    summary: '작업 메모 작성',
    description:
      '작가가 해당 커미션 작업에 메모를 작성. 메모는 의뢰인에게 노출됨. 여러 개 작성 가능.',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @ApiResponse({ status: 403, type: CreateCommissionWorkMemo403Response })
  @ApiResponse({ status: 404, type: CreateCommissionWorkMemo404Response })
  @Post(':id/memos')
  async createMemo(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
    @Body() dto: CreateCommissionWorkMemoRequest,
  ): Promise<IdResponse> {
    return this.service.createMemo(userId, workId, dto);
  }

  @ApiOperation({
    summary: '커미션 후기(유저 평가) 작성',
    description:
      'COMPLETED 상태의 커미션에 대해 의뢰인/작가가 상대방에게 후기를 작성. 한 사람당 1회만 작성 가능.',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @ApiResponse({ status: 403, type: CreateCommissionReview403Response })
  @ApiResponse({ status: 404, type: CreateCommissionReview404Response })
  @ApiResponse({ status: 409, type: CreateCommissionReview409Response })
  @Post(':id/reviews')
  async createReview(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) workId: string,
    @Body() dto: CreateCommissionReviewRequest,
  ): Promise<IdResponse> {
    return this.service.createReview(userId, workId, dto);
  }
}
