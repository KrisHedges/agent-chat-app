import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AgentOrchestrator } from '../src/agent/orchestrator.js';
import { Message, StreamEvent } from '../src/agent/types.js';
import { ToolRegistry } from '../src/agent/skills/registry.js';
import { ToolDefinition } from '../src/agent/types.js';

describe('Agent Orchestrator Unit Tests', () => {
  it('should correctly format multi-modal parts for Gemini (images, json, csv, text)', () => {
    const orchestrator = new AgentOrchestrator();

    const messages: Message[] = [
      {
        id: 'msg_1',
        role: 'user',
        content: 'Analyze this multi-modal payload',
        attachments: [
          {
            id: 'att_img',
            name: 'chart.png',
            size: 2048,
            mimeType: 'image/png',
            category: 'image',
            base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
          {
            id: 'att_json',
            name: 'data.json',
            size: 64,
            mimeType: 'application/json',
            category: 'json',
            base64Data: Buffer.from('{"metric": 100}').toString('base64'),
          },
          {
            id: 'att_csv',
            name: 'table.csv',
            size: 32,
            mimeType: 'text/csv',
            category: 'csv',
            base64Data: Buffer.from('col1,col2\n1,2').toString('base64'),
          },
          {
            id: 'att_txt',
            name: 'notes.txt',
            size: 16,
            mimeType: 'text/plain',
            category: 'text',
            base64Data: Buffer.from('sample notes').toString('base64'),
          },
        ],
      },
      {
        id: 'msg_empty',
        role: 'model',
        content: '',
      },
    ];

    const formatted = (orchestrator as any).formatMessagesForGemini(messages);

    assert.strictEqual(formatted.length, 2);
    assert.strictEqual(formatted[0].role, 'user');
    assert.strictEqual(formatted[0].parts.length, 5); // 4 attachments + 1 text prompt

    // Part 0: image inlineData
    assert.strictEqual(formatted[0].parts[0].inlineData.mimeType, 'image/png');

    // Part 1: JSON file formatted text
    assert.match(formatted[0].parts[1].text, /data\.json/);

    // Part 2: CSV file formatted text
    assert.match(formatted[0].parts[2].text, /table\.csv/);

    // Part 3: Text file formatted text
    assert.match(formatted[0].parts[3].text, /notes\.txt/);

    // Part 4: Prompt text
    assert.strictEqual(formatted[0].parts[4].text, 'Analyze this multi-modal payload');

    // Message 2: empty fallback
    assert.strictEqual(formatted[1].role, 'model');
    assert.strictEqual(formatted[1].parts[0].text, ' ');
  });

  it('should handle unconfigured API key gracefully without network calls', async () => {
    const { config } = await import('../src/config.js');
    const origConfigKey = config.geminiApiKey;
    const origGeminiKey = process.env.GEMINI_API_KEY;
    const origGoogleKey = process.env.GOOGLE_API_KEY;

    try {
      config.geminiApiKey = '';
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const orchestrator = new AgentOrchestrator();
      const emittedEvents: StreamEvent[] = [];

      const messages: Message[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Test query with unconfigured key',
          attachments: [
            {
              id: 'att_1',
              name: 'metrics.json',
              size: 512,
              mimeType: 'application/json',
              category: 'json',
              base64Data: Buffer.from('{}').toString('base64'),
            },
          ],
        },
      ];

      await orchestrator.streamTurn(messages, (event) => {
        emittedEvents.push(event);
      });

      const fullContent = emittedEvents
        .filter((e) => e.type === 'token')
        .map((e) => (e as any).content)
        .join('');

      assert.match(fullContent, /I am not connected to Gemini/);
      assert.match(fullContent, /metrics\.json/);
    } finally {
      config.geminiApiKey = origConfigKey;
      if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;
      if (origGoogleKey) process.env.GOOGLE_API_KEY = origGoogleKey;
    }
  });

  it('should stream a full turn with mock Gemini client and text tokens', async () => {
    async function* mockStream() {
      yield { text: 'Hello ' };
      yield { text: 'from ' };
      yield { text: 'Gemini!' };
    }

    const mockClient = {
      models: {
        generateContentStream: async () => mockStream(),
      },
    };

    const orchestrator = new AgentOrchestrator({ geminiClient: mockClient });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'Say hello' }],
      (e) => events.push(e),
      'Custom system prompt',
      'gemini-3.8-flash'
    );

    const tokens = events.filter((e) => e.type === 'token').map((e: any) => e.content).join('');
    assert.strictEqual(tokens, 'Hello from Gemini!');

    const hasDone = events.some((e) => e.type === 'done');
    assert.strictEqual(hasDone, true);
  });

  it('should execute tool call and stream follow-up answer preserving thoughtSignature', async () => {
    let callCount = 0;
    const contentsHistory: any[] = [];

    async function* mockToolStream(params: any) {
      callCount++;
      contentsHistory.push(JSON.parse(JSON.stringify(params.contents)));

      if (callCount === 1) {
        // First turn: model emits function call with thoughtSignature
        yield {
          text: '',
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    thought: true,
                    text: 'Computing 5 * 10',
                  },
                  {
                    functionCall: {
                      name: 'calculator',
                      args: { expression: '5 * 10' },
                    },
                    thoughtSignature: 'sig_mock_token_12345',
                  },
                ],
              },
            },
          ],
        };
      } else {
        // Second turn: model answers with result
        yield {
          text: 'The answer is 50.',
        };
      }
    }

    const mockClient = {
      models: {
        generateContentStream: async (params: any) => mockToolStream(params),
      },
    };

    const orchestrator = new AgentOrchestrator({ geminiClient: mockClient });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'What is 5 * 10?' }],
      (e) => events.push(e)
    );

    assert.strictEqual(callCount, 2);

    // Verify tool events were emitted
    const toolCallEvent = events.find((e) => e.type === 'tool_call') as any;
    assert.ok(toolCallEvent);
    assert.strictEqual(toolCallEvent.tool.name, 'calculator');

    const toolResultEvent = events.find((e) => e.type === 'tool_result') as any;
    assert.ok(toolResultEvent);
    assert.strictEqual(toolResultEvent.result.result.result, 50);

    // Verify thoughtSignature was preserved in the second call contents
    const secondTurnContents = contentsHistory[1];
    const modelTurn = secondTurnContents.find((c: any) => c.role === 'model');
    assert.ok(modelTurn);

    const fcPart = modelTurn.parts.find((p: any) => p.functionCall);
    assert.ok(fcPart);
    assert.strictEqual(fcPart.thoughtSignature, 'sig_mock_token_12345');

    // Verify user tool response turn was appended
    const userToolResponse = secondTurnContents[secondTurnContents.length - 1];
    assert.strictEqual(userToolResponse.role, 'user');
    assert.strictEqual(userToolResponse.parts[0].functionResponse.response.result.result, 50);
  });

  it('should handle tool not found in registry gracefully', async () => {
    let turn = 0;
    async function* mockStream() {
      turn++;
      if (turn === 1) {
        yield {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: { name: 'unknown_tool', args: {} },
                  },
                ],
              },
            },
          ],
        };
      } else {
        yield { text: 'Turn complete' };
      }
    }

    const mockClient = {
      models: {
        generateContentStream: async () => mockStream(),
      },
    };

    const orchestrator = new AgentOrchestrator({ geminiClient: mockClient });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'Call unknown tool' }],
      (e) => events.push(e)
    );

    const resultEvent = events.find((e) => e.type === 'tool_result') as any;
    assert.ok(resultEvent);
    assert.match(resultEvent.result.result.error, /Tool unknown_tool not found/);
  });

  it('should handle tool throwing an exception during execution', async () => {
    const errorTool: ToolDefinition = {
      name: 'broken_tool',
      description: 'A tool that fails',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        throw new Error('Database connection failed');
      },
    };

    const customRegistry = new ToolRegistry();
    customRegistry.register(errorTool);

    let turn = 0;
    async function* mockStream() {
      turn++;
      if (turn === 1) {
        yield {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: { name: 'broken_tool', args: {} },
                  },
                ],
              },
            },
          ],
        };
      } else {
        yield { text: 'Turn complete' };
      }
    }

    const mockClient = {
      models: {
        generateContentStream: async () => mockStream(),
      },
    };

    const orchestrator = new AgentOrchestrator({
      geminiClient: mockClient,
      toolRegistry: customRegistry,
    });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'Run broken tool' }],
      (e) => events.push(e)
    );

    const resultEvent = events.find((e) => e.type === 'tool_result') as any;
    assert.ok(resultEvent);
    assert.strictEqual(resultEvent.result.result.error, 'Database connection failed');
  });

  it('should catch unhandled stream exception and emit formatted error event', async () => {
    const mockClient = {
      models: {
        generateContentStream: async () => {
          throw new Error('Service Unavailable 503');
        },
      },
    };

    const orchestrator = new AgentOrchestrator({ geminiClient: mockClient });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'Hello' }],
      (e) => events.push(e)
    );

    const errorEvent = events.find((e) => e.type === 'error') as any;
    assert.ok(errorEvent);
    assert.match(errorEvent.error, /503/);
  });

  it('should emit error when Gemini client cannot be initialized (ai is null)', async () => {
    const orchestrator = new AgentOrchestrator({ geminiClient: null });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'Hello' }],
      (e) => events.push(e)
    );

    const errorEvent = events.find((e) => e.type === 'error') as any;
    assert.ok(errorEvent);
    assert.match(errorEvent.error, /Check server GEMINI_API_KEY configuration/);
    assert.strictEqual(events[events.length - 1].type, 'done');
  });

  it('should handle chunk.text throwing an exception when only functionCall is present', async () => {
    let turnCount = 0;
    const mockClient = {
      models: {
        generateContentStream: async () => {
          turnCount++;
          if (turnCount === 1) {
            return (async function* () {
              yield {
                get text(): string {
                  throw new Error('chunk.text not available when only functionCall is present');
                },
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          functionCall: {
                            id: 'call_calc_99',
                            name: 'calculator',
                            args: { expression: '7 * 7' },
                          },
                        },
                      ],
                    },
                  },
                ],
              };
            })();
          }
          return (async function* () {
            yield { text: '49' };
          })();
        },
      },
    };

    const orchestrator = new AgentOrchestrator({ geminiClient: mockClient });
    const events: StreamEvent[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'What is 7 * 7?' }],
      (e) => events.push(e)
    );

    const toolCallEvent = events.find((e) => e.type === 'tool_call') as any;
    assert.ok(toolCallEvent);
    assert.strictEqual(toolCallEvent.tool.name, 'calculator');
    const tokenEvent = events.find((e) => e.type === 'token') as any;
    assert.strictEqual(tokenEvent.content, '49');
  });
});

