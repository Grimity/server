import { Injectable } from '@nestjs/common';
import { CustomException } from 'src/core/exception/custom.exception';
import { IdResponse } from 'src/shared/response/id.response';
import type {
  CommissionAnswerItem,
  CreateCommissionWorkRequest,
} from './dto/commission-work.request';
import { CommissionWorkErrorCode } from './dto/commission-work.error';
import { CommissionWorkReader } from './repository/commission-work.reader';
import { CommissionWorkWriter } from './repository/commission-work.writer';

type AnswerType = 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT';

interface AnswerMeta {
  type: AnswerType;
  title: string;
  description: string | null;
  isRequired: boolean;
  options: string[];
}

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

    const answers = dto.commissionId
      ? await this.buildFormAnswers(dto)
      : this.buildDirectAnswers(dto);

    return await this.writer.create({
      authorId: dto.authorId,
      clientId,
      commissionId: dto.commissionId ?? null,
      answers,
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

    return commission.questions.map((q, i) =>
      this.buildAnswer(
        {
          type: q.type as AnswerType,
          title: q.title,
          description: q.description ?? null,
          isRequired: q.isRequired,
          options: q.options,
        },
        answers[i],
      ),
    );
  }

  private buildDirectAnswers(
    dto: CreateCommissionWorkRequest,
  ): PrismaJson.CommissionAnswer[] {
    const answers = dto.answers ?? [];
    return answers.map((a) => {
      if (!a.type) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.ANSWER_TYPE_REQUIRED,
        });
      }
      const title = (a.title ?? '').trim();
      if (title.length === 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.ANSWER_TITLE_REQUIRED,
        });
      }
      const isRequired = a.isRequired ?? false;
      const options = a.type === 'TEXT' ? [] : (a.options ?? []);
      if (a.type !== 'TEXT' && options.length === 0) {
        throw new CustomException(400, {
          errorCode: CommissionWorkErrorCode.SELECT_OPTIONS_REQUIRED,
        });
      }
      return this.buildAnswer(
        {
          type: a.type,
          title,
          description: a.description ?? null,
          isRequired,
          options,
        },
        a,
      );
    });
  }

  private buildAnswer(
    meta: AnswerMeta,
    a: CommissionAnswerItem,
  ): PrismaJson.CommissionAnswer {
    let text: string | null = null;
    let selectedOptions: string[] = [];

    if (meta.type === 'TEXT') {
      text = (a.text ?? '').trim();
      if (meta.isRequired && text.length === 0) {
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
      const optionSet = new Set(meta.options);
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
      if (meta.type === 'SINGLE_SELECT') {
        if (meta.isRequired && chosen.length !== 1) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
          });
        }
        if (!meta.isRequired && chosen.length > 1) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
          });
        }
      } else {
        if (meta.isRequired && chosen.length === 0) {
          throw new CustomException(400, {
            errorCode: CommissionWorkErrorCode.MULTI_SELECT_ANSWER_REQUIRED,
          });
        }
      }
      selectedOptions = chosen;
    }

    return {
      type: meta.type,
      title: meta.title,
      description: meta.description,
      isRequired: meta.isRequired,
      options: meta.options,
      text,
      selectedOptions,
    };
  }
}
