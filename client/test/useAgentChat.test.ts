import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentChat } from '../src/hooks/useAgentChat.js';
import { Attachment } from '../src/types/index.js';

describe('useAgentChat Hook', () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  // Helper to create SSE ReadableStream
  function createSseStream(lines: string[]) {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + '\n'));
        }
        controller.close();
      },
    });
  }

  it('fetches conversations on mount and handles switching user', async () => {
    const mockConversations = [
      { id: 'c1', title: 'Conv 1', createdAt: 100, updatedAt: 100, messageCount: 2 },
    ];

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/conversations')) {
        return {
          ok: true,
          json: async () => ({ conversations: mockConversations }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result, rerender } = renderHook(({ userId }) => useAgentChat(userId), {
      initialProps: { userId: 'user_1' },
    });

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.conversations).toEqual(mockConversations);

    // Switch user
    rerender({ userId: 'user_2' });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.currentConversationId).toBeNull();
  });

  it('handles attachment manipulation and startNewChat', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [] }),
    });

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    const att1: Attachment = { id: 'a1', name: 'f1.txt', size: 10, mimeType: 'text/plain', category: 'text' };
    const att2: Attachment = { id: 'a2', name: 'f2.txt', size: 20, mimeType: 'text/plain', category: 'text' };

    act(() => {
      result.current.addAttachment(att1);
      result.current.addAttachment(att2);
    });
    expect(result.current.attachments.length).toBe(2);

    act(() => {
      result.current.removeAttachment('a1');
    });
    expect(result.current.attachments.length).toBe(1);
    expect(result.current.attachments[0].id).toBe('a2');

    act(() => {
      result.current.clearAttachments();
    });
    expect(result.current.attachments.length).toBe(0);

    act(() => {
      result.current.clearChat();
    });
    expect(result.current.messages.length).toBe(0);
  });

  it('loads and deletes conversations', async () => {
    const mockConversationDetail = {
      id: 'c1',
      userId: 'user_1',
      title: 'Detailed Conv',
      model: 'gemini-3.5-pro',
      systemPrompt: 'Custom prompt',
      messages: [{ id: 'm1', role: 'user', content: 'hello', timestamp: 100 }],
      createdAt: 100,
      updatedAt: 100,
    };

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === 'DELETE') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      if (url.includes('/api/conversations/c1')) {
        return {
          ok: true,
          json: async () => ({ conversation: mockConversationDetail }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          conversations: [{ id: 'c1', title: 'Detailed Conv', createdAt: 100, updatedAt: 100, messageCount: 1 }],
        }),
      };
    });

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    // Load conversation
    await act(async () => {
      await result.current.loadConversation('c1');
    });

    expect(result.current.currentConversationId).toBe('c1');
    expect(result.current.messages.length).toBe(1);
    expect(result.current.settings.model).toBe('gemini-3.5-pro');
    expect(result.current.settings.systemPrompt).toBe('Custom prompt');

    // Delete conversation
    await act(async () => {
      await result.current.deleteConversation('c1');
    });

    expect(result.current.conversations.length).toBe(0);
    expect(result.current.currentConversationId).toBeNull();
  });

  it('sends message and processes full SSE streaming with tool calls and persistence', async () => {
    const streamEvents = [
      'data: {"type":"status","message":"Consulting Gemini..."}',
      'data: {"type":"tool_call","tool":{"callId":"call_1","name":"calculator","args":{"expression":"2+2"}}}',
      'data: {"type":"status","message":"Executing calculator..."}',
      'data: {"type":"tool_result","result":{"callId":"call_1","result":{"value":4}}}',
      'data: {"type":"token","content":"The answer "}',
      'data: {"type":"token","content":"is 4."}',
      'data: {"type":"done"}',
    ];

    let persistedConversation: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (url === '/api/chat/stream') {
        return {
          ok: true,
          body: createSseStream(streamEvents),
        };
      }
      if (url === '/api/conversations' && opts?.method === 'POST') {
        persistedConversation = JSON.parse(opts.body).conversation;
        return { ok: true, json: async () => ({ success: true }) };
      }
      return {
        ok: true,
        json: async () => ({ conversations: [] }),
      };
    });

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage('What is 2+2?');
    });

    // Check message list
    expect(result.current.messages.length).toBe(2);
    const [userMsg, agentMsg] = result.current.messages;
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toBe('What is 2+2?');

    expect(agentMsg.role).toBe('model');
    expect(agentMsg.content).toBe('The answer is 4.');
    expect(agentMsg.toolCalls?.length).toBe(1);
    expect(agentMsg.toolResults?.length).toBe(1);

    // Verify persistence was triggered
    expect(persistedConversation).not.toBeNull();
    expect(persistedConversation.title).toBe('What is 2+2?');
    expect(persistedConversation.userId).toBe('user_1');
  });

  it('handles stream error event and supports retryLastMessage', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/chat/stream') {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            body: createSseStream([
              'data: {"type":"error","error":"Quota exceeded 429"}',
              'data: {"type":"done"}',
            ]),
          };
        } else {
          return {
            ok: true,
            body: createSseStream([
              'data: {"type":"token","content":"Recovered successfully!"}',
              'data: {"type":"done"}',
            ]),
          };
        }
      }
      return {
        ok: true,
        json: async () => ({ conversations: [] }),
      };
    });

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    // First attempt fails with error event
    await act(async () => {
      await result.current.sendMessage('Test failing prompt');
    });

    expect(result.current.messages.length).toBe(2);
    const failedAgentMsg = result.current.messages[1];
    expect(failedAgentMsg.isError).toBe(true);
    expect(failedAgentMsg.errorMessage).toBe('Quota exceeded 429');

    // Retry last message with failed agent message ID
    await act(async () => {
      await result.current.retryLastMessage(failedAgentMsg.id);
    });

    expect(result.current.messages.length).toBe(2);
    const retriedAgentMsg = result.current.messages[1];
    expect(retriedAgentMsg.isError).toBeFalsy();
    expect(retriedAgentMsg.content).toBe('Recovered successfully!');
  });

  it('handles HTTP network failure gracefully', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/chat/stream') {
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        };
      }
      return {
        ok: true,
        json: async () => ({ conversations: [] }),
      };
    });

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage('Hello server');
    });

    const agentMsg = result.current.messages[1];
    expect(agentMsg.isError).toBe(true);
    expect(agentMsg.errorMessage).toContain('HTTP error 503');
  });

  it('does not send message when text is empty and no attachments', async () => {
    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/conversations')) {
        return { ok: true, json: async () => ({ conversations: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    global.fetch = fetchSpy;

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(result.current.messages.length).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalledWith(
      '/api/chat/stream',
      expect.anything()
    );
  });

  it('handles retryLastMessage without failedMessageId fallback and handles API errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    let streamTurnCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url === '/api/chat/stream') {
        streamTurnCount++;
        if (streamTurnCount === 1) {
          // First attempt fails
          return {
            ok: true,
            body: createSseStream([
              'data: {"type":"error","error":"Temporary failure"}',
              'data: {"type":"done"}',
            ]),
          };
        }
        // Second attempt succeeds
        return {
          ok: true,
          body: createSseStream([
            'data: {"type":"token","content":"Retry success"}',
            'data: {"type":"done"}',
          ]),
        };
      }
      if (url.includes('/api/conversations')) {
        return { ok: true, json: async () => ({ conversations: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useAgentChat('user_1'));
    await act(async () => {
      await Promise.resolve();
    });

    // Send first message that fails
    await act(async () => {
      await result.current.sendMessage('Calculate numbers');
    });
    expect(result.current.messages[1].isError).toBe(true);

    // Call retryLastMessage with NO parameters (fallback search)
    await act(async () => {
      await result.current.retryLastMessage();
    });
    expect(result.current.messages[1].content).toBe('Retry success');

    // Test error handling in fetchConversations, loadConversation, deleteConversation
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.loadConversation('c_fail');
      await result.current.deleteConversation('c_fail');
    });

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

