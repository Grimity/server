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
  SELECT_HAS_ATTACHED_IMAGES: 'SELECT_HAS_ATTACHED_IMAGES',
  SELECTED_OPTION_NOT_IN_OPTIONS: 'SELECTED_OPTION_NOT_IN_OPTIONS',
  SELECTED_OPTIONS_DUPLICATED: 'SELECTED_OPTIONS_DUPLICATED',
  SINGLE_SELECT_ANSWER_INVALID: 'SINGLE_SELECT_ANSWER_INVALID',
  MULTI_SELECT_ANSWER_REQUIRED: 'MULTI_SELECT_ANSWER_REQUIRED',

  AUTHOR_NOT_FOUND: 'AUTHOR_NOT_FOUND',
  COMMISSION_NOT_FOUND: 'COMMISSION_NOT_FOUND',
  WORK_NOT_FOUND: 'WORK_NOT_FOUND',

  NOT_COMMISSION_AUTHOR: 'NOT_COMMISSION_AUTHOR',
  NOT_COMMISSION_CLIENT: 'NOT_COMMISSION_CLIENT',
  NOT_COMMISSION_PARTICIPANT: 'NOT_COMMISSION_PARTICIPANT',

  WORK_NOT_PENDING: 'WORK_NOT_PENDING',
  WORK_NOT_ACTIVE: 'WORK_NOT_ACTIVE',
  WORK_NOT_COMPLETABLE: 'WORK_NOT_COMPLETABLE',
  WORK_NOT_COMPLETED: 'WORK_NOT_COMPLETED',
  ALREADY_REVIEWED: 'ALREADY_REVIEWED',
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
  CommissionWorkErrorCode.SELECT_HAS_ATTACHED_IMAGES,
  CommissionWorkErrorCode.SELECTED_OPTION_NOT_IN_OPTIONS,
  CommissionWorkErrorCode.SELECTED_OPTIONS_DUPLICATED,
  CommissionWorkErrorCode.SINGLE_SELECT_ANSWER_INVALID,
  CommissionWorkErrorCode.MULTI_SELECT_ANSWER_REQUIRED,
] as const;

const code404 = [
  CommissionWorkErrorCode.AUTHOR_NOT_FOUND,
  CommissionWorkErrorCode.COMMISSION_NOT_FOUND,
] as const;

const acceptCode403 = [CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR] as const;

const acceptCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const acceptCode409 = [CommissionWorkErrorCode.WORK_NOT_PENDING] as const;

const rejectCode403 = [CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR] as const;

const rejectCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const rejectCode409 = [CommissionWorkErrorCode.WORK_NOT_PENDING] as const;

const cancelCode403 = [CommissionWorkErrorCode.NOT_COMMISSION_CLIENT] as const;

const cancelCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const cancelCode409 = [CommissionWorkErrorCode.WORK_NOT_PENDING] as const;

const uploadResultCode403 = [
  CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR,
] as const;

const uploadResultCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const uploadResultCode409 = [CommissionWorkErrorCode.WORK_NOT_ACTIVE] as const;

const createMemoCode403 = [
  CommissionWorkErrorCode.NOT_COMMISSION_AUTHOR,
] as const;

const createMemoCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const completeCode403 = [
  CommissionWorkErrorCode.NOT_COMMISSION_CLIENT,
] as const;

const completeCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const completeCode409 = [CommissionWorkErrorCode.WORK_NOT_COMPLETABLE] as const;

const createReviewCode403 = [
  CommissionWorkErrorCode.NOT_COMMISSION_PARTICIPANT,
] as const;

const createReviewCode404 = [CommissionWorkErrorCode.WORK_NOT_FOUND] as const;

const createReviewCode409 = [
  CommissionWorkErrorCode.WORK_NOT_COMPLETED,
  CommissionWorkErrorCode.ALREADY_REVIEWED,
] as const;

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

export class AcceptCommissionWork403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: acceptCode403 })
  errorCode: (typeof acceptCode403)[number];
}

export class AcceptCommissionWork404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: acceptCode404 })
  errorCode: (typeof acceptCode404)[number];
}

export class AcceptCommissionWork409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({ enum: acceptCode409 })
  errorCode: (typeof acceptCode409)[number];
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

export class CancelCommissionWork403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: cancelCode403 })
  errorCode: (typeof cancelCode403)[number];
}

export class CancelCommissionWork404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: cancelCode404 })
  errorCode: (typeof cancelCode404)[number];
}

export class CancelCommissionWork409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({ enum: cancelCode409 })
  errorCode: (typeof cancelCode409)[number];
}

export class UploadCommissionWorkResult403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: uploadResultCode403 })
  errorCode: (typeof uploadResultCode403)[number];
}

export class UploadCommissionWorkResult404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: uploadResultCode404 })
  errorCode: (typeof uploadResultCode404)[number];
}

export class UploadCommissionWorkResult409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({ enum: uploadResultCode409 })
  errorCode: (typeof uploadResultCode409)[number];
}

export class CreateCommissionWorkMemo403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: createMemoCode403 })
  errorCode: (typeof createMemoCode403)[number];
}

export class CreateCommissionWorkMemo404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: createMemoCode404 })
  errorCode: (typeof createMemoCode404)[number];
}

export class CompleteCommissionWork403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: completeCode403 })
  errorCode: (typeof completeCode403)[number];
}

export class CompleteCommissionWork404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: completeCode404 })
  errorCode: (typeof completeCode404)[number];
}

export class CompleteCommissionWork409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({ enum: completeCode409 })
  errorCode: (typeof completeCode409)[number];
}

export class CreateCommissionReview403Response {
  @ApiProperty({ enum: [403] })
  status: 403;

  @ApiProperty({ enum: createReviewCode403 })
  errorCode: (typeof createReviewCode403)[number];
}

export class CreateCommissionReview404Response {
  @ApiProperty({ enum: [404] })
  status: 404;

  @ApiProperty({ enum: createReviewCode404 })
  errorCode: (typeof createReviewCode404)[number];
}

export class CreateCommissionReview409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({ enum: createReviewCode409 })
  errorCode: (typeof createReviewCode409)[number];
}
