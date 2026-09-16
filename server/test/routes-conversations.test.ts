import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { Server } from 'node:http';
import { conversationsRouter } from '../src/routes/conversations.js';
import { defaultConversationStore } from '../src/storage/conversation-store.js';

describe('Conversations Routes API Tests (/api/conversations)', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/conversations', conversationsRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/conversations`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/conversations should require userId query parameter', async () => {
    const res = await fetch(baseUrl);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /userId/);
  });

  it('POST /api/conversations should validate conversation body', async () => {
    const resNoBody = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resNoBody.status, 400);

    const resNoId = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: { userId: 'alice' } }),
    });
    assert.strictEqual(resNoId.status, 400);
  });

  it('POST, GET, and DELETE /api/conversations full lifecycle', async () => {
    const testConvId = `conv_test_${Date.now()}`;
    const testUserId = 'dev_test_user';

    // 1. Save conversation
    const postRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: {
          id: testConvId,
          userId: testUserId,
          title: 'Route Test Session',
          model: 'gemini-3.8-flash',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [{ id: 'm1', role: 'user', content: 'What is 1+1?' }],
        },
      }),
    });
    assert.strictEqual(postRes.status, 200);
    const postBody = await postRes.json();
    assert.strictEqual(postBody.success, true);
    assert.strictEqual(postBody.conversation.title, 'Route Test Session');

    // 2. List conversations
    const listRes = await fetch(`${baseUrl}?userId=${testUserId}`);
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(Array.isArray(listBody.conversations));
    assert.ok(listBody.conversations.some((c: any) => c.id === testConvId));

    // 3. Get single conversation
    const getRes = await fetch(`${baseUrl}/${testConvId}?userId=${testUserId}`);
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.conversation.id, testConvId);
    assert.strictEqual(getBody.conversation.messages[0].content, 'What is 1+1?');

    // 4. Get requires userId
    const getNoUser = await fetch(`${baseUrl}/${testConvId}`);
    assert.strictEqual(getNoUser.status, 400);

    // 5. Get non-existent returns 404
    const getNotFound = await fetch(`${baseUrl}/non_existent_conv?userId=${testUserId}`);
    assert.strictEqual(getNotFound.status, 404);

    // 6. Delete conversation
    const deleteRes = await fetch(`${baseUrl}/${testConvId}?userId=${testUserId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.strictEqual(deleteBody.success, true);

    // 7. Delete requires userId
    const deleteNoUser = await fetch(`${baseUrl}/${testConvId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(deleteNoUser.status, 400);

    // 8. Confirm deleted from get
    const getAfterDelete = await fetch(`${baseUrl}/${testConvId}?userId=${testUserId}`);
    assert.strictEqual(getAfterDelete.status, 404);
  });

  it('should return 500 when conversation store operations fail', async () => {
    const origList = defaultConversationStore.list;
    const origGet = defaultConversationStore.get;
    const origSave = defaultConversationStore.save;
    const origDelete = defaultConversationStore.delete;

    try {
      // 1. list throws
      defaultConversationStore.list = async () => {
        throw new Error('Database disk error');
      };
      const resList = await fetch(`${baseUrl}?userId=dev_err`);
      assert.strictEqual(resList.status, 500);

      // 2. get throws
      defaultConversationStore.get = async () => {
        throw new Error('Decryption corrupt error');
      };
      const resGet = await fetch(`${baseUrl}/c123?userId=dev_err`);
      assert.strictEqual(resGet.status, 500);

      // 3. save throws
      defaultConversationStore.save = async () => {
        throw new Error('Write permission denied');
      };
      const resSave = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: { id: 'c1', userId: 'dev_err', title: 'Test', messages: [] },
        }),
      });
      assert.strictEqual(resSave.status, 500);

      // 4. delete throws
      defaultConversationStore.delete = async () => {
        throw new Error('File locked error');
      };
      const resDelete = await fetch(`${baseUrl}/c1?userId=dev_err`, {
        method: 'DELETE',
      });
      assert.strictEqual(resDelete.status, 500);
    } finally {
      defaultConversationStore.list = origList;
      defaultConversationStore.get = origGet;
      defaultConversationStore.save = origSave;
      defaultConversationStore.delete = origDelete;
    }
  });
});

