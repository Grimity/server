export function convertCode(code: string) {
  switch (code) {
    case 'P2002':
      return 'UNIQUE_CONSTRAINT';
    case 'P2003':
      return 'FOREIGN_KEY_CONSTRAINT';
    case 'P2025':
      return 'NOT_FOUND';
    default:
      return null;
  }
}
