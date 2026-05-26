export const commissionWorkStatuses = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELED',
] as const;
export type CommissionWorkStatus = (typeof commissionWorkStatuses)[number];
