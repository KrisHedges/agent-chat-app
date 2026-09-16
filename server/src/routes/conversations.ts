import { Router, Request, Response } from 'express';
import { defaultConversationStore, Conversation } from '../storage/conversation-store.js';
import { logger } from '../utils/logger.js';

export const conversationsRouter = Router();

// GET /api/conversations?userId=...
conversationsRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Query parameter "userId" is required.' });
    return;
  }

  try {
    const list = await defaultConversationStore.list(userId);
    res.json({ conversations: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[GET /api/conversations] Error:', msg);
    res.status(500).json({ error: msg });
  }
});

// GET /api/conversations/:id?userId=...
conversationsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = req.query.userId as string;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Query parameter "userId" is required.' });
    return;
  }

  try {
    const conversation = await defaultConversationStore.get(id, userId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found or access denied.' });
      return;
    }
    res.json({ conversation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[GET /api/conversations/${id}] Error:`, msg);
    res.status(500).json({ error: msg });
  }
});

// POST /api/conversations
conversationsRouter.post('/', async (req: Request, res: Response) => {
  const conversation = req.body.conversation as Conversation;

  if (!conversation || !conversation.id || !conversation.userId) {
    res.status(400).json({ error: 'Invalid request: "conversation" object with "id" and "userId" is required.' });
    return;
  }

  try {
    const now = Date.now();
    const updated: Conversation = {
      ...conversation,
      createdAt: conversation.createdAt || now,
      updatedAt: now,
    };

    await defaultConversationStore.save(updated);
    res.json({ success: true, conversation: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[POST /api/conversations] Error saving:', msg);
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/conversations/:id?userId=...
conversationsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = req.query.userId as string;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Query parameter "userId" is required.' });
    return;
  }

  try {
    const deleted = await defaultConversationStore.delete(id, userId);
    res.json({ success: deleted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[DELETE /api/conversations/${id}] Error:`, msg);
    res.status(500).json({ error: msg });
  }
});
