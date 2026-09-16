import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  encryptPayload,
  decryptPayload,
  getEncryptionKey,
  resetCachedKeyForTesting,
} from '../src/storage/crypto.js';

describe('AES-256-GCM Encryption Tests', () => {
  it('should encrypt and decrypt a JSON payload faithfully', () => {
    const original = {
      message: 'Sensitive enterprise insight regarding Q3 churn',
      numbers: [42, 108, 3.14159],
      nested: { secretKey: 'abracadabra', active: true },
    };

    const envelope = encryptPayload(original);

    // Verify envelope format
    assert.strictEqual(typeof envelope.iv, 'string');
    assert.strictEqual(typeof envelope.authTag, 'string');
    assert.strictEqual(typeof envelope.ciphertext, 'string');
    assert.strictEqual(envelope.iv.length, 24); // 12 bytes hex
    assert.strictEqual(envelope.authTag.length, 32); // 16 bytes hex

    // Verify ciphertext does not leak plaintext
    assert.ok(!envelope.ciphertext.includes('Sensitive'));
    assert.ok(!envelope.ciphertext.includes('abracadabra'));

    // Decrypt and verify equality
    const decrypted = decryptPayload<typeof original>(envelope);
    assert.deepStrictEqual(decrypted, original);
  });

  it('should support explicit overrideKey buffer', () => {
    const customKey = crypto.randomBytes(32);
    const data = { user: 'alice', role: 'admin' };

    const envelope = encryptPayload(data, customKey);
    const decrypted = decryptPayload<typeof data>(envelope, customKey);

    assert.deepStrictEqual(decrypted, data);

    // Wrong key fails
    const wrongKey = crypto.randomBytes(32);
    assert.throws(() => {
      decryptPayload(envelope, wrongKey);
    });
  });

  it('should derive key from process.env.ENCRYPTION_KEY when set', () => {
    const origEnv = process.env.ENCRYPTION_KEY;
    try {
      resetCachedKeyForTesting();
      process.env.ENCRYPTION_KEY = 'my-super-secret-passphrase';

      const key = getEncryptionKey();
      assert.strictEqual(key.length, 32);

      // Verify cached key is returned
      const key2 = getEncryptionKey();
      assert.strictEqual(key, key2);
    } finally {
      if (origEnv) process.env.ENCRYPTION_KEY = origEnv;
      else delete process.env.ENCRYPTION_KEY;
      resetCachedKeyForTesting();
    }
  });

  it('should fail decryption if ciphertext is tampered with', () => {
    const envelope = encryptPayload({ data: 'Confidential' });

    // Flip bits in ciphertext
    const tamperedCiphertext = envelope.ciphertext.startsWith('a')
      ? 'b' + envelope.ciphertext.slice(1)
      : 'a' + envelope.ciphertext.slice(1);

    const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };

    assert.throws(() => {
      decryptPayload(tamperedEnvelope);
    });
  });

  it('should fail decryption if authTag is tampered with', () => {
    const envelope = encryptPayload({ data: 'Confidential' });

    const tamperedTag = envelope.authTag.startsWith('f')
      ? '0' + envelope.authTag.slice(1)
      : 'f' + envelope.authTag.slice(1);

    const tamperedEnvelope = { ...envelope, authTag: tamperedTag };

    assert.throws(() => {
      decryptPayload(tamperedEnvelope);
    });
  });

  it('should generate machine-local dev key file when ENCRYPTION_KEY is unset', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const origEnv = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    resetCachedKeyForTesting();

    const devKeyPath = path.resolve(process.cwd(), 'data', '.dev_key');
    let backupHex: string | null = null;
    if (fs.existsSync(devKeyPath)) {
      backupHex = fs.readFileSync(devKeyPath, 'utf-8');
      fs.unlinkSync(devKeyPath);
    }

    try {
      // 1. First call generates fresh .dev_key
      const key1 = getEncryptionKey();
      assert.strictEqual(key1.length, 32);
      assert.ok(fs.existsSync(devKeyPath));

      // 2. Clear cache and call again: reads existing .dev_key
      resetCachedKeyForTesting();
      const key2 = getEncryptionKey();
      assert.strictEqual(key2.length, 32);
      assert.deepStrictEqual(key1, key2);
    } finally {
      if (backupHex !== null) {
        fs.writeFileSync(devKeyPath, backupHex, 'utf-8');
      }
      if (origEnv) process.env.ENCRYPTION_KEY = origEnv;
      resetCachedKeyForTesting();
    }
  });
});

