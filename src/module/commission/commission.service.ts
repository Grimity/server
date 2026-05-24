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

    const tags = [
      ...new Set(
        dto.tags.map((t) => t.replaceAll(' ', '').replaceAll('#', '')),
      ),
    ];

    return await this.writer.create(userId, { ...dto, tags });
  }
}
