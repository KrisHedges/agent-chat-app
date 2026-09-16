import { Router, Request, Response } from 'express';
import { defaultOrchestrator } from '../agent/orchestrator.js';
import { ChatRequest, StreamEvent } from '../agent/types.js';
import { logger } from '../utils/logger.js';

export const chatRouter = Router();

chatRouter.post('/stream', async (req: Request, res: Response) => {
  const { messages, model, systemPrompt } = req.body as ChatRequest;
  const targetModel = model || 'default';
  logger.log(`\n[POST /api/chat/stream] Incoming request: ${messages?.length ?? 0} messages | Model: ${targetModel}`);

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    logger.warn('[POST /api/chat/stream] Bad request: "messages" array is missing or empty.');
    res.status(400).json({ error: 'Invalid request: "messages" array is required.' });
    return;
  }

  // Set SSE Headers with no-buffering for proxies (Vite dev server)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  res.flushHeaders?.();

  let eventCount = 0;
  let clientAborted = false;
  req.on('aborted', () => {
    clientAborted = true;
    logger.log(`[POST /api/chat/stream] Client aborted request. (Total events sent: ${eventCount})`);
  });

  const emit = (event: StreamEvent) => {
    if (res.writableEnded || clientAborted) return;
    eventCount++;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    (res as any).flush?.();
  };

  try {
    await defaultOrchestrator.streamTurn(messages, emit, systemPrompt, model);
    logger.log(`[POST /api/chat/stream] Turn finished successfully. (Total events sent: ${eventCount})`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.stack || err.message : String(err);
    logger.error('[POST /api/chat/stream] Unhandled error during streaming:', errorMsg);
    emit({ type: 'error', error: errorMsg });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

chatRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
