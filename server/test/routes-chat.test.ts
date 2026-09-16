import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { Server } from 'node:http';
import { chatRouter } from '../src/routes/chat.js';

describe('Chat Routes API Tests (/api/chat)', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  const origGemini = process.env.GEMINI_API_KEY;
  const origGoogle = process.env.GOOGLE_API_KEY;
  let origConfigKey = '';

  before(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    const { config } = await import('../src/config.js');
    origConfigKey = config.geminiApiKey;
    config.geminiApiKey = '';

    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/chat`;
        resolve();
      });
    });
  });

  after(async () => {
    if (origGemini) process.env.GEMINI_API_KEY = origGemini;
    if (origGoogle) process.env.GOOGLE_API_KEY = origGoogle;
    const { config } = await import('../src/config.js');
    config.geminiApiKey = origConfigKey;

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/chat/health should return ok status and timestamp', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.ok(body.timestamp);
  });

  it('POST /api/chat/stream should return 400 if messages array is missing or empty', async () => {
    const resMissing = await fetch(`${baseUrl}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resMissing.status, 400);

    const resEmpty = await fetch(`${baseUrl}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    assert.strictEqual(resEmpty.status, 400);
  });

  it('POST /api/chat/stream should establish SSE stream with headers and events', async () => {
    const res = await fetch(`${baseUrl}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ id: '1', role: 'user', content: 'Ping' }],
        model: 'gemini-3.8-flash',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/event-stream');
    assert.strictEqual(res.headers.get('x-accel-buffering'), 'no');

    const reader = res.body?.getReader();
    assert.ok(reader);

    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value);
    }

    assert.ok(accumulated.includes('data:'));
    // Unconfigured or configured will both terminate with done
    assert.ok(accumulated.includes('"type":"done"') || accumulated.includes('"type":"token"'));
  });

  it('POST /api/chat/stream should handle client abort gracefully', async () => {
    const controller = new AbortController();
    const resPromise = fetch(`${baseUrl}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ id: '1', role: 'user', content: 'Ping abort' }],
      }),
      signal: controller.signal,
    });

    // Abort shortly after initiation
    setTimeout(() => controller.abort(), 10);

    try {
      const res = await resPromise;
      const reader = res.body?.getReader();
      while (reader) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      // AbortError is expected on client side
    }
  });

  it('POST /api/chat/stream should handle unhandled orchestrator exception and emit error event', async () => {
    const { defaultOrchestrator } = await import('../src/agent/orchestrator.js');
    const origStreamTurn = defaultOrchestrator.streamTurn;

    defaultOrchestrator.streamTurn = async () => {
      throw new Error('Fatal stream failure');
    };

    try {
      const res = await fetch(`${baseUrl}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ id: '1', role: 'user', content: 'Ping fail' }],
        }),
      });

      assert.strictEqual(res.status, 200);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
      }
      assert.ok(accumulated.includes('Fatal stream failure'));
    } finally {
      defaultOrchestrator.streamTurn = origStreamTurn;
    }
  });
});

