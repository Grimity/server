export const commissionQuestionTypes = [
  'TEXT',
  'SINGLE_SELECT',
  'MULTI_SELECT',
] as const;
export type CommissionQuestionType = (typeof commissionQuestionTypes)[number];
