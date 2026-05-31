import { ApiProperty } from '@nestjs/swagger';

export const CommissionWorkErrorCode = {
  SELF_REQUEST_NOT_ALLOWED: 'SELF_REQUEST_NOT_ALLOWED',
  COMMISSION_AUTHOR_MISMATCH: 'COMMISSION_AUTHOR_MISMATCH',
  ANSWERS_LENGTH_MISMATCH: 'ANSWERS_LENGTH_MISMATCH',
  ANSWER_TYPE_REQUIRED: 'ANSWER_TYPE_REQUIRED',
  ANSWER_TITLE_REQUIRED: 'ANSWER_TITLE_REQUIRED',
  SELECT_OPTIONS_REQUIRED: 'SELECT_OPTIONS_REQUIRED',
  TEXT_ANSWER_REQUIRED: 'TEXT_ANSWER_REQUIRED',
  TEXT_HAS_SELECTED_OPTIONS: 'TEXT_HAS_SELECTED_OPTIONS',
  SELECT_HAS_TEXT: 'SELECT_HAS_TEXT',
  SELECTED_OPTION_NOT_IN_OPTIONS: 'SELECTED_OPTION_NOT_IN_OPTIONS',
  SELECTED_OPTIONS_DUPLICATED: 'SELECTED_OPTIONS_DUPLICATED',
  SINGLE_SELECT_ANSWER_INVALID: 'SINGLE_SELECT_ANSWER_INVALID',
  MULTI_SELECT_ANSWER_REQUIRED: 'MULTI_SELECT_ANSWER_REQUIRED',

  AUTHOR_NOT_FOUND: 'AUTHOR_NOT_FOUND',
  COMMISSION_NOT_FOUND: 'COMMISSION_NOT_FOUND',
  WORK_NOT_FOUND: 'WORK_NOT_FOUND',

  NOT_COMMISSION_AUTHOR: 'NOT_COMMISSION_AUTHOR',

  WORK_NOT_PENDING: 'WORK_NOT_PENDING',
} as const;

const code400 = [
  CommissionWorkErrorCode.SELF_REQUEST_NOT_ALLOWED,
  CommissionWorkErrorCode.COMMISSION_AUTHOR_MISMATCH,
  CommissionWorkErrorCode.ANSWERS_LENGTH_MISMATCH,
  CommissionWorkErrorCode.ANSWER_TYPE_REQUIRED,
  CommissionWorkErrorCode.ANSWER_TITLE_REQUIRED,
  CommissionWorkErrorCode.SELECT_OPTIONS_REQUIRED,
  CommissionWorkErrorCode.TEXT_ANSWER_REQUIRED,
  CommissionWorkErrorCode.TEXT_HAS_SELECTED_OPTIONS,
  CommissionWorkErrorCode.SELECT_HAS_TEXT,
  CommissionWorkErrorCode.SELECTED_OPTION_NOT_IN_OPTIONS,
  CommissionWorkErrorCode.SELECTED_OPTIONS_DUPLICATED,
  CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
  CommissionWorkErrorCode.MULTI_SELECT_ANSWER_REQUIRED,
] as const;

const code404 = [
  CommissionWorkErrorCode.AUTHOR_NOT_FOUND,
  CommissionWorkErrorCode.COMMISSION_NOT_FOUND,
] as const;

const rejectCode403 = [CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR] as const;

const rejectCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const rejectCode409 = [CommissionWorkErrorCode.WORK_NOT_PENDING] as const;

export class CreateCommissionWork400Response {
  @ApiProperty({ enum: [400] })
  status: 400;

  @ApiProperty({ enum: code400 })
  errorCode: (typeof code400)[number];
}

export class CreateCommissionWork404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: code404 })
  errorCode: (typeof code404)[number];
}

export class RejectCommissionWork403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: rejectCode403 })
  errorCode: (typeof rejectCode403)[number];
}

export class RejectCommissionWork404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: rejectCode404 })
  errorCode: (typeof rejectCode404)[number];
}

export class RejectCommissionWork409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({ enum: rejectCode409 })
  errorCode: (typeof rejectCode409)[number];
}
