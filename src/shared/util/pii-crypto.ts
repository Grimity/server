import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION_PREFIX = 'v1:';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

export function encryptPii(
  plain: string,
  key: Buffer,
  aad: string,
): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return VERSION_PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptPii(
  encoded: string,
  key: Buffer,
  aad: string,
): string {
  if (!encoded.startsWith(VERSION_PREFIX)) {
    throw new Error('Unsupported ciphertext version');
  }
  const payload = Buffer.from(encoded.slice(VERSION_PREFIX.length), 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}
