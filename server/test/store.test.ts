import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { FileConversationStore, Conversation } from '../src/storage/conversation-store.js';
import { encryptPayload } from '../src/storage/crypto.js';

describe('FileConversationStore Tests (Encrypted at Rest)', () => {
  const testDir = path.resolve(process.cwd(), 'data', 'test_conversations');
  let store: FileConversationStore;

  before(async () => {
    store = new FileConversationStore(testDir);
  });

  after(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should save a conversation and verify file on disk is encrypted', async () => {
    const conversation: Conversation = {
      id: 'conv_123',
      userId: 'alice_looker',
      title: 'Sales Churn Analysis',
      model: 'gemini-3.8-flash',
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Hello, can you examine our sales churn?',
        },
        {
          id: 'msg_2',
          role: 'model',
          content: 'Certainly! I can inspect churn across tiers.',
        },
      ],
    };

    await store.save(conversation);

    // Check physical file on disk
    const expectedFilePath = path.join(testDir, 'alice_looker__conv_123.enc.json');
    assert.ok(fsSync.existsSync(expectedFilePath), 'File should exist on disk');

    const rawContent = await fs.readFile(expectedFilePath, 'utf-8');
    assert.ok(!rawContent.includes('Sales Churn Analysis'));
    assert.ok(!rawContent.includes('Certainly! I can inspect churn'));
    assert.ok(rawContent.includes('"ciphertext"'));
    assert.ok(rawContent.includes('"iv"'));
    assert.ok(rawContent.includes('"authTag"'));
  });

  it('should retrieve and decrypt conversation for authorized user', async () => {
    const fetched = await store.get('conv_123', 'alice_looker');
    assert.ok(fetched);
    assert.strictEqual(fetched?.id, 'conv_123');
    assert.strictEqual(fetched?.title, 'Sales Churn Analysis');
    assert.strictEqual(fetched?.messages.length, 2);
    assert.strictEqual(fetched?.messages[0].content, 'Hello, can you examine our sales churn?');
  });

  it('should prevent access from another user (user isolation)', async () => {
    const fetched = await store.get('conv_123', 'bob_looker');
    assert.strictEqual(fetched, null);
  });

  it('should return null when reading non-existent conversation', async () => {
    const fetched = await store.get('non_existent', 'alice_looker');
    assert.strictEqual(fetched, null);
  });

  it('should return null when reading corrupted or invalid file', async () => {
    const corruptedPath = path.join(testDir, 'alice_looker__conv_corrupted.enc.json');
    await fs.writeFile(corruptedPath, 'NOT_VALID_JSON', 'utf-8');

    const fetched = await store.get('conv_corrupted', 'alice_looker');
    assert.strictEqual(fetched, null);
  });

  it('should return null if decrypted userId does not match requested userId', async () => {
    const mismatchedPayload: Conversation = {
      id: 'conv_mismatch',
      userId: 'hacker',
      title: 'Spoofed',
      model: 'gemini-3.8-flash',
      createdAt: 100,
      updatedAt: 100,
      messages: [],
    };
    const envelope = encryptPayload(mismatchedPayload);
    const spoofedPath = path.join(testDir, 'alice_looker__conv_mismatch.enc.json');
    await fs.writeFile(spoofedPath, JSON.stringify(envelope), 'utf-8');

    const fetched = await store.get('conv_mismatch', 'alice_looker');
    assert.strictEqual(fetched, null);
  });

  it('should list conversations for a user sorted by updatedAt, skipping corrupted files', async () => {
    const conversation2: Conversation = {
      id: 'conv_456',
      userId: 'alice_looker',
      title: 'Recent Inventory Queries',
      model: 'gemini-3.8-flash',
      createdAt: 1700000010000,
      updatedAt: 1700000020000,
      messages: [
        {
          id: 'msg_3',
          role: 'user',
          content: 'Show me stock level',
        },
      ],
    };
    await store.save(conversation2);

    const summaries = await store.list('alice_looker');
    assert.strictEqual(summaries.length, 2);
    // conv_456 has higher updatedAt, should be first
    assert.strictEqual(summaries[0].id, 'conv_456');
    assert.strictEqual(summaries[1].id, 'conv_123');
    assert.strictEqual(summaries[0].lastMessagePreview, 'Show me stock level');
  });

  it('should return empty list for user with no conversations', async () => {
    const summaries = await store.list('brand_new_user');
    assert.deepStrictEqual(summaries, []);
  });

  it('should delete a conversation file and return false when deleting non-existent file', async () => {
    const deleted = await store.delete('conv_123', 'alice_looker');
    assert.strictEqual(deleted, true);

    const notFound = await store.delete('conv_123', 'alice_looker');
    assert.strictEqual(notFound, false);
  });

  it('should handle list error when baseDir cannot be read', async () => {
    // Instantiate store with a path pointing to a file instead of directory (readdir throws ENOTDIR)
    const filePath = path.join(testDir, 'dummy_file.txt');
    await fs.writeFile(filePath, 'dummy');
    const brokenStore = new FileConversationStore(filePath);

    const summaries = await brokenStore.list('any_user');
    assert.deepStrictEqual(summaries, []);
  });

  it('should rethrow error in delete if error is not ENOENT', async () => {
    // Create a directory at the expected file path so unlink throws EISDIR / EPERM
    const dirAsFile = path.join(testDir, 'dir_user__conv_dir.enc.json');
    await fs.mkdir(dirAsFile);

    await assert.rejects(async () => {
      await store.delete('conv_dir', 'dir_user');
    });
  });
});

