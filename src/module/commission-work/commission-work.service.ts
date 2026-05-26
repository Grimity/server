import { Injectable } from '@nestjs/common';
import { CustomException } from 'src/core/exception/custom.exception';
import { IdResponse } from 'src/shared/response/id.response';
import type { CreateCommissionWorkRequest } from './dto/commission-work.request';
import { CommissionWorkErrorCode } from './dto/commission-work.error';
import { CommissionWorkReader } from './repository/commission-work.reader';
import { CommissionWorkWriter } from './repository/commission-work.writer';

@Injectable()
export class CommissionWorkService {
  constructor(
    private readonly reader: CommissionWorkReader,
    private readonly writer: CommissionWorkWriter,
  ) {}

  async create(
    clientId: string,
    dto: CreateCommissionWorkRequest,
  ): Promise<IdResponse> {
    if (dto.authorId === clientId) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.SELF_REQUEST_NOT_ALLOWED,
      });
    }

    const author = await this.reader.findUserById(dto.authorId);
    if (!author) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.AUTHOR_NOT_FOUND,
      });
    }

    let answers: PrismaJson.CommissionAnswer[];

    if (dto.commissionId) {
      answers = await this.buildFormAnswers(dto);
      if (dto.description !== undefined) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.FORM_HAS_DESCRIPTION,
        });
      }
      if (dto.proposedPrice !== undefined) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.FORM_HAS_PROPOSED_PRICE,
        });
      }
    } else {
      this.validateDirect(dto);
      answers = [];
    }

    return await this.writer.create({
      authorId: dto.authorId,
      clientId,
      commissionId: dto.commissionId ?? null,
      answers,
      description: dto.description ?? null,
      proposedPrice: dto.proposedPrice ?? null,
      referenceImages: dto.referenceImages,
    });
  }

  private async buildFormAnswers(
    dto: CreateCommissionWorkRequest,
  ): Promise<PrismaJson.CommissionAnswer[]> {
    const commission = await this.reader.findCommissionWithQuestions(
      dto.commissionId!,
    );
    if (!commission) {
      throw new CustomException(404, {
        errorCode: CommissionWorkErrorCode.COMMISSION_NOT_FOUND,
      });
    }
    if (commission.authorId !== dto.authorId) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.COMMISSION_AUTHOR_MISMATCH,
      });
    }

    const answers = dto.answers ?? [];
    if (answers.length !== commission.questions.length) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.ANSWERS_LENGTH_MISMATCH,
      });
    }

    return commission.questions.map((q, i) => {
      const a = answers[i];
      const type = q.type as 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT';

      let text: string | null = null;
      let selectedOptions: string[] = [];

      if (type === 'TEXT') {
        text = (a.text ?? '').trim();
        if (q.isRequired && text.length === 0) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.TEXT_ANSWER_REQUIRED,
          });
        }
        if (a.selectedOptions && a.selectedOptions.length > 0) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.TEXT_HAS_SELECTED_OPTIONS,
          });
        }
      } else {
        if (a.text !== undefined && a.text !== null && a.text !== '') {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SELECT_HAS_TEXT,
          });
        }
        const chosen = a.selectedOptions ?? [];
        const optionSet = new Set(q.options);
        for (const o of chosen) {
          if (!optionSet.has(o)) {
            throw new CustomException(400, {
              errorCode: CommissionWorkErrorCode.SELECTED_OPTION_NOT_IN_OPTIONS,
            });
          }
        }
        if (new Set(chosen).size !== chosen.length) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SELECTED_OPTIONS_DUPLICATED,
          });
        }
        if (type === 'SINGLE_SELECT') {
          if (q.isRequired && chosen.length !== 1) {
            throw new CustomException(400, {
              errorCode: CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
            });
          }
          if (!q.isRequired && chosen.length > 1) {
            throw new CustomException(400, {
              errorCode: CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
            });
          }
        } else {
          if (q.isRequired && chosen.length === 0) {
            throw new CustomException(400, {
              errorCode: CommissionWorkErrorCode.MULTI_SELECT_ANSWER_REQUIRED,
            });
          }
        }
        selectedOptions = chosen;
      }

      return {
        type,
        title: q.title,
        description: q.description ?? null,
        isRequired: q.isRequired,
        options: q.options,
        text,
        selectedOptions,
      };
    });
  }

  private validateDirect(dto: CreateCommissionWorkRequest): void {
    if (dto.answers !== undefined) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.DIRECT_HAS_ANSWERS,
      });
    }
    const description = (dto.description ?? '').trim();
    if (description.length === 0) {
      throw new CustomException(400, {
        errorCode: CommissionWorkErrorCode.DIRECT_DESCRIPTION_REQUIRED,
      });
    }
  }
}
