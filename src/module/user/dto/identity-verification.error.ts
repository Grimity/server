import { ApiProperty } from '@nestjs/swagger';

export const IdentityVerificationErrorCode = {
  NOT_VERIFIED: 'NOT_VERIFIED',
  CI_NOT_PROVIDED: 'CI_NOT_PROVIDED',
  INCOMPLETE_VERIFIED_CUSTOMER: 'INCOMPLETE_VERIFIED_CUSTOMER',

  CI_MISMATCH: 'CI_MISMATCH',
  CI_TAKEN: 'CI_TAKEN',
  ID_REUSED: 'ID_REUSED',
} as const;

export class VerifyIdentity409Response {
  @ApiProperty({ enum: [409] })
  status: 409;

  @ApiProperty({
    enum: [
      IdentityVerificationErrorCode.CI_MISMATCH,
      IdentityVerificationErrorCode.CI_TAKEN,
      IdentityVerificationErrorCode.ID_REUSED,
    ],
  })
  errorCode:
    | typeof IdentityVerificationErrorCode.CI_MISMATCH
    | typeof IdentityVerificationErrorCode.CI_TAKEN
    | typeof IdentityVerificationErrorCode.ID_REUSED;
}

export class VerifyIdentity422Response {
  @ApiProperty({ enum: [422] })
  status: 422;

  @ApiProperty({
    enum: [
      IdentityVerificationErrorCode.NOT_VERIFIED,
      IdentityVerificationErrorCode.CI_NOT_PROVIDED,
      IdentityVerificationErrorCode.INCOMPLETE_VERIFIED_CUSTOMER,
    ],
  })
  errorCode:
    | typeof IdentityVerificationErrorCode.NOT_VERIFIED
    | typeof IdentityVerificationErrorCode.CI_NOT_PROVIDED
    | typeof IdentityVerificationErrorCode.INCOMPLETE_VERIFIED_CUSTOMER;
}
