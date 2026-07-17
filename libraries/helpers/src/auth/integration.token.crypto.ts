import crypto from 'crypto';

// AES-256-GCM with a dedicated key (INTEGRATION_TOKEN_KEY) and a fresh
// random IV per encrypt call. Distinct from AuthService.fixedEncryption
// (AES-256-CBC, fixed key+IV derived from JWT_SECRET) -- that scheme is
// fine for lower-stakes secrets, but not for OAuth access/refresh tokens:
// a fixed IV means encrypting the same value twice yields the same
// ciphertext, and CBC has no built-in tamper detection. GCM's auth tag
// makes a tampered/corrupted ciphertext fail to decrypt loudly instead
// of silently producing garbage that gets trusted as a real token.
// Uses its own env var (not JWT_SECRET) so rotating the session-signing
// secret doesn't also break every stored integration token.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.INTEGRATION_TOKEN_KEY;
  if (!secret) {
    throw new Error(
      'INTEGRATION_TOKEN_KEY env var is required to encrypt/decrypt integration tokens. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `INTEGRATION_TOKEN_KEY must decode to 32 bytes (got ${key.length}) -- generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  }
  return key;
}

export function encryptIntegrationToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decryptIntegrationToken(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error(
      'Malformed encrypted integration token (expected "iv:authTag:ciphertext")'
    );
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

// A stored value produced by encryptIntegrationToken always has exactly
// two ':' separators between three base64 segments. Used to distinguish
// already-encrypted rows from legacy plaintext ones during the read path.
export function isEncryptedIntegrationToken(value: string): boolean {
  return /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(value);
}
