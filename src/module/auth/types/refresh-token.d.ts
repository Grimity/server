export type RefreshTokenPayload = {
  id: string;
  type: 'WEB' | 'APP';
  device: string;
  model: string;
};
