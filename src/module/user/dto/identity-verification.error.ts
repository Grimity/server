import { ApiProperty } from '@nestjs/swagger';

export const IdentityVerificationErrorCode = {
  NOT_VERIFIED: 'NOT_VERIFIED',
  VERIFICATION_NOT_FOUND: 'VERIFICATION_NOT_FOUND',
  CI_NOT_PROVIDED: 'CI_NOT_PROVIDED',
  INCOMPLETE_VERIFIED_CUSTOMER: 'INCOMPLETE_VERIFIED_CUSTOMER',
  INVALID_VERIFIED_AT: 'INVALID_VERIFIED_AT',
  STALE_VERIFICATION: 'STALE_VERIFICATION',

  CI_MISMATCH: 'CI_MISMATCH',
  CI_TAKEN: 'CI_TAKEN',
  ID_REUSED: 'ID_REUSED',
  UNKNOWN: 'UNKNOWN',

  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  PORTONE_ERROR: 'PORTONE_ERROR',

  PORTONE_AUTH: 'PORTONE_AUTH',
} as const;

export class VerifyIdentity409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({
    enum: [
      IdentityVerificationErrorCode.CI_MISMATCH,
      IdentityVerificationErrorCode.CI_TAKEN,
      IdentityVerificationErrorCode.ID_REUSED,
      IdentityVerificationErrorCode.UNKNOWN,
    ],
  })
  errorCode:
    | typeof IdentityVerificationErrorCode.CI_MISMATCH
    | typeof IdentityVerificationErrorCode.CI_TAKEN
    | typeof IdentityVerificationErrorCode.ID_REUSED
    | typeof IdentityVerificationErrorCode.UNKNOWN;
}

export class VerifyIdentity422Response {
  @ApiProperty({ enum: [422] })
  status: 422;

  @ApiProperty({
    enum: [
      IdentityVerificationErrorCode.NOT_VERIFIED,
      IdentityVerificationErrorCode.VERIFICATION_NOT_FOUND,
      IdentityVerificationErrorCode.CI_NOT_PROVIDED,
      IdentityVerificationErrorCode.INCOMPLETE_VERIFIED_CUSTOMER,
      IdentityVerificationErrorCode.INVALID_VERIFIED_AT,
      IdentityVerificationErrorCode.STALE_VERIFICATION,
    ],
  })
  errorCode:
    | typeof IdentityVerificationErrorCode.NOT_VERIFIED
    | typeof IdentityVerificationErrorCode.VERIFICATION_NOT_FOUND
    | typeof IdentityVerificationErrorCode.CI_NOT_PROVIDED
    | typeof IdentityVerificationErrorCode.INCOMPLETE_VERIFIED_CUSTOMER
    | typeof IdentityVerificationErrorCode.INVALID_VERIFIED_AT
    | typeof IdentityVerificationErrorCode.STALE_VERIFICATION;
}

export class VerifyIdentity500Response {
  @ApiProperty({ enum: [500] })
  status: 500;

  @ApiProperty({ enum: [IdentityVerificationErrorCode.PORTONE_AUTH] })
  errorCode: typeof IdentityVerificationErrorCode.PORTONE_AUTH;
}

export class VerifyIdentity502Response {
  @ApiProperty({ enum: [502] })
  status: 502;

  @ApiProperty({
    enum: [
      IdentityVerificationErrorCode.UPSTREAM_UNAVAILABLE,
      IdentityVerificationErrorCode.PORTONE_ERROR,
    ],
  })
  errorCode:
    | typeof IdentityVerificationErrorCode.UPSTREAM_UNAVAILABLE
    | typeof IdentityVerificationErrorCode.PORTONE_ERROR;
}
