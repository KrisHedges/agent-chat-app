import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  getEffectiveApiKey,
  isApiKeyConfigured,
  getGeminiClient,
  resetGeminiClientForTesting,
} from '../src/agent/gemini-client.js';
import { config } from '../src/config.js';

describe('Gemini Client Unit Tests', () => {
  const origGeminiKey = process.env.GEMINI_API_KEY;
  const origGoogleKey = process.env.GOOGLE_API_KEY;
  const origConfigKey = config.geminiApiKey;

  beforeEach(() => {
    resetGeminiClientForTesting();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    config.geminiApiKey = '';
  });

  it('should return empty string and false when no key is configured', () => {
    assert.strictEqual(getEffectiveApiKey(), '');
    assert.strictEqual(isApiKeyConfigured(), false);
    assert.strictEqual(getGeminiClient(), null);
  });

  it('should prioritize GEMINI_API_KEY over other sources', () => {
    process.env.GEMINI_API_KEY = 'gemini-env-key-12345';
    process.env.GOOGLE_API_KEY = 'google-env-key';
    config.geminiApiKey = 'config-key';

    assert.strictEqual(getEffectiveApiKey(), 'gemini-env-key-12345');
    assert.strictEqual(isApiKeyConfigured(), true);
  });

  it('should fallback to GOOGLE_API_KEY if GEMINI_API_KEY is missing', () => {
    process.env.GOOGLE_API_KEY = 'google-env-key-99999';
    config.geminiApiKey = 'config-key';

    assert.strictEqual(getEffectiveApiKey(), 'google-env-key-99999');
    assert.strictEqual(isApiKeyConfigured(), true);
  });

  it('should fallback to config.geminiApiKey if env vars are missing', () => {
    config.geminiApiKey = 'config-only-key';

    assert.strictEqual(getEffectiveApiKey(), 'config-only-key');
    assert.strictEqual(isApiKeyConfigured(), true);
  });

  it('should initialize and cache GoogleGenAI client instance when key is configured', () => {
    process.env.GEMINI_API_KEY = 'AIzaSyTestKey1234567890';

    const client1 = getGeminiClient();
    assert.ok(client1);

    // Call again to verify caching returns the exact same instance
    const client2 = getGeminiClient();
    assert.strictEqual(client1, client2);
  });

  it('should handle short keys when masking key for logging', () => {
    process.env.GEMINI_API_KEY = 'short';
    const client = getGeminiClient();
    assert.ok(client);
  });

  // Restore env after tests
  it('cleanup and restore original environment', () => {
    if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;
    if (origGoogleKey) process.env.GOOGLE_API_KEY = origGoogleKey;
    config.geminiApiKey = origConfigKey;
    resetGeminiClientForTesting();
  });
});
