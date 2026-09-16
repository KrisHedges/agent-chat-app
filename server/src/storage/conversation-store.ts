import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { encryptPayload, decryptPayload, EncryptedEnvelope } from './crypto.js';
import { Message } from '../agent/types.js';
import { logger } from '../utils/logger.js';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessagePreview?: string;
}

export class FileConversationStore {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.resolve(process.cwd(), 'data', 'conversations');
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(userId: string, conversationId: string): string {
    // Sanitize user and conversation IDs to prevent path traversal
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeId = conversationId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.baseDir, `${safeUser}__${safeId}.enc.json`);
  }

  /**
   * Saves a conversation, encrypting its contents before writing to disk.
   */
  async save(conversation: Conversation): Promise<void> {
    const filePath = this.getFilePath(conversation.userId, conversation.id);
    const envelope = encryptPayload<Conversation>(conversation);
    const content = JSON.stringify(envelope, null, 2);
    await fs.writeFile(filePath, content, { encoding: 'utf-8' });
  }

  /**
   * Retrieves and decrypts a specific conversation.
   * Returns null if not found or unauthorized.
   */
  async get(id: string, userId: string): Promise<Conversation | null> {
    const filePath = this.getFilePath(userId, id);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const envelope: EncryptedEnvelope = JSON.parse(raw);
      const conversation = decryptPayload<Conversation>(envelope);

      if (conversation.userId !== userId) {
        return null;
      }
      return conversation;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      logger.error(`[ConversationStore] Failed to read/decrypt conversation ${id}:`, err);
      return null;
    }
  }

  /**
   * Lists all conversations for a specific user, returning metadata summaries sorted by updatedAt desc.
   */
  async list(userId: string): Promise<ConversationSummary[]> {
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const prefix = `${safeUser}__`;

    try {
      const files = await fs.readdir(this.baseDir);
      const userFiles = files.filter((f) => f.startsWith(prefix) && f.endsWith('.enc.json'));

      const summaries: ConversationSummary[] = [];

      for (const file of userFiles) {
        try {
          const filePath = path.join(this.baseDir, file);
          const raw = await fs.readFile(filePath, 'utf-8');
          const envelope: EncryptedEnvelope = JSON.parse(raw);
          const conversation = decryptPayload<Conversation>(envelope);

          if (conversation.userId === userId) {
            const lastMsg = conversation.messages[conversation.messages.length - 1];
            summaries.push({
              id: conversation.id,
              userId: conversation.userId,
              title: conversation.title,
              model: conversation.model,
              createdAt: conversation.createdAt,
              updatedAt: conversation.updatedAt,
              messageCount: conversation.messages.length,
              lastMessagePreview: lastMsg?.content ? lastMsg.content.slice(0, 80) : undefined,
            });
          }
        } catch {
          // Skip unparseable or corrupted files gracefully
        }
      }

      return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      logger.error(`[ConversationStore] Error listing conversations for user ${userId}:`, err);
      return [];
    }
  }

  /**
   * Deletes an encrypted conversation file.
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const filePath = this.getFilePath(userId, id);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }
}

export const defaultConversationStore = new FileConversationStore();
