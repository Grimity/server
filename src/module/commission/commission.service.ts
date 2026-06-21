import { HttpException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { CustomException } from 'src/core/exception/custom.exception';
import { IdentityVerificationErrorCode } from 'src/module/user/dto/identity-verification.error';
import { UserReader } from 'src/module/user/repository/user.reader';
import { IdResponse } from 'src/shared/response/id.response';
import { CreateCommissionRequest } from './dto/commission.request';
import { CommissionWriter } from './repository/commission.writer';

@Injectable()
export class CommissionService {
  constructor(
    private readonly userReader: UserReader,
    private readonly writer: CommissionWriter,
  ) {}

  @Transactional()
  async create(
    userId: string,
    dto: CreateCommissionRequest,
  ): Promise<IdResponse> {
    const verified =
      await this.userReader.findIdentityVerificationByUserId(userId);
    if (!verified) {
      throw new CustomException(422, {
        errorCode: IdentityVerificationErrorCode.NOT_VERIFIED,
      });
    }

    const tags = this.validatePayload(dto);

    return await this.writer.create(userId, { ...dto, tags });
  }

  @Transactional()
  async update(
    userId: string,
    commissionId: string,
    dto: CreateCommissionRequest,
  ): Promise<void> {
    const tags = this.validatePayload(dto);

    const updated = await this.writer.update(userId, commissionId, {
      ...dto,
      tags,
    });
    if (!updated) {
      throw new HttpException('COMMISSION', 404);
    }
  }

  async delete(userId: string, commissionId: string): Promise<void> {
    const deleted = await this.writer.softDelete(userId, commissionId);
    if (!deleted) {
      throw new HttpException('COMMISSION', 404);
    }
  }

  /**
   * create/update 공통 페이로드 검증. thumbnail∈images, 질문 옵션 규칙을 확인하고
   * 정제(공백·# 제거 + dedup)된 tags 배열을 반환한다.
   */
  private validatePayload(dto: CreateCommissionRequest): string[] {
    if (!dto.images.includes(dto.thumbnail)) {
      throw new HttpException('THUMBNAIL_NOT_IN_IMAGES', 400);
    }
    for (const q of dto.questions) {
      const isSelect = q.type === 'SINGLE_SELECT' || q.type === 'MULTI_SELECT';
      if (isSelect && q.options.length === 0) {
        throw new HttpException('OPTIONS_TOO_FEW', 400);
      }
      if (!isSelect && q.options.length !== 0) {
        throw new HttpException('TEXT_HAS_OPTIONS', 400);
      }
    }

    return [
      ...new Set(
        dto.tags.map((t) => t.replaceAll(' ', '').replaceAll('#', '')),
      ),
    ];
  }
}
