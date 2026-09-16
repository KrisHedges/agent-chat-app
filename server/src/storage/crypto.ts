import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';


const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // Standard 128-bit auth tag

export interface EncryptedEnvelope {
  version: number;
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // hex
}

let cachedKey: Buffer | null = null;

export function resetCachedKeyForTesting(): void {
  cachedKey = null;
}

/**
 * Resolves the 32-byte encryption key:
 * 1. From process.env.ENCRYPTION_KEY (if provided)
 * 2. Or from a machine-local file in server/data/.dev_key (for zero-config local dev)
 */
export function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.trim().length > 0) {
    // Hash or normalize to ensure exactly 32 bytes (256 bits)
    cachedKey = crypto.createHash('sha256').update(envKey.trim()).digest();
    return cachedKey;
  }

  // Fallback: machine-local dev key in server/data/.dev_key
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const devKeyPath = path.join(dataDir, '.dev_key');
  if (fs.existsSync(devKeyPath)) {
    const hex = fs.readFileSync(devKeyPath, 'utf-8').trim();
    cachedKey = Buffer.from(hex, 'hex');
    return cachedKey;
  }

  // Generate a fresh cryptographically random 32-byte key for local development
  const freshKey = crypto.randomBytes(32);
  fs.writeFileSync(devKeyPath, freshKey.toString('hex'), { encoding: 'utf-8', mode: 0o600 });
  cachedKey = freshKey;
  logger.log('[Crypto] Generated machine-local dev encryption key in server/data/.dev_key');
  return cachedKey;
}

/**
 * Encrypts any JSON-serializable object with AES-256-GCM.
 */
export function encryptPayload<T>(data: T, overrideKey?: Buffer): EncryptedEnvelope {
  const key = overrideKey || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const jsonString = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonString, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM envelope and parses as JSON.
 * Throws if authentication tag fails (tamper detection).
 */
export function decryptPayload<T>(envelope: EncryptedEnvelope, overrideKey?: Buffer): T {
  const key = overrideKey || getEncryptionKey();
  const iv = Buffer.from(envelope.iv, 'hex');
  const authTag = Buffer.from(envelope.authTag, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf-8')) as T;
}
