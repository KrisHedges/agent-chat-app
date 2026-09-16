import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatGeminiError } from '../src/agent/orchestrator.js';

describe('Gemini Error Formatter Tests', () => {
  it('should parse 503 high demand error from raw API stack error', () => {
    const rawError = new Error(
      'ApiError: {"error":{"message":"{\\n  \\"error\\": {\\n    \\"code\\": 503,\\n    \\"message\\": \\"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.\\",\\n    \\"status\\": \\"UNAVAILABLE\\"\\n  }\\n}\\n","code":503,"status":"Service Unavailable"}} at throwErrorIfNotOK (/Users/krishedges/Code/agent-proto/agent-chat-app/node_modules/@google/genai/src/_api_client.ts:1091:24)'
    );

    const formatted = formatGeminiError(rawError);
    assert.strictEqual(
      formatted,
      'Gemini is currently experiencing high demand (503 Service Unavailable). Spikes in demand are temporary. Please try again.'
    );
  });

  it('should parse 429 rate limit error', () => {
    const rawError = new Error(
      'ApiError: {"error":{"code":429,"message":"Resource exhausted","status":"RESOURCE_EXHAUSTED"}}'
    );

    const formatted = formatGeminiError(rawError);
    assert.strictEqual(
      formatted,
      'Gemini API rate limit exceeded (429). Please wait a few seconds and try again.'
    );
  });

  it('should format clean message when error message is generic text', () => {
    const rawError = new Error('Network timeout after 30000ms');
    const formatted = formatGeminiError(rawError);
    assert.strictEqual(formatted, 'Network timeout after 30000ms');
  });

  it('should handle undefined or null errors gracefully', () => {
    assert.strictEqual(
      formatGeminiError(null),
      'An unexpected error occurred while communicating with Gemini.'
    );
  });

  it('should handle malformed JSON inside braces by falling back to string parsing', () => {
    const rawError = new Error('ApiError: {bad: json, unquoted} occurred during generation');
    const formatted = formatGeminiError(rawError);
    assert.strictEqual(formatted, '{bad: json, unquoted} occurred during generation');
  });

  it('should truncate extremely long single-line error messages at 200 chars', () => {
    const veryLongError = new Error('ApiError: ' + 'A'.repeat(250));
    const formatted = formatGeminiError(veryLongError);
    assert.strictEqual(formatted.length, 200);
    assert.ok(formatted.endsWith('...'));
  });

  it('should extract simple message property from parsed JSON error', () => {
    const rawError = new Error('ApiError: {"error":{"message":"Simple permission denied message"}}');
    const formatted = formatGeminiError(rawError);
    assert.strictEqual(formatted, 'Simple permission denied message');
  });
});

