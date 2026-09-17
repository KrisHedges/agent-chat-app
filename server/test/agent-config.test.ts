import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { Server } from 'node:http';
import {
  loadAgentConfig,
  loadSystemPrompt,
  isLockdownActive,
  resolveAgentFile,
  resetAgentConfigCache,
} from '../src/agent/agent-config.js';
import { agentConfigRouter } from '../src/routes/agent-config.js';
import { AgentOrchestrator } from '../src/agent/orchestrator.js';

describe('Agent Manifest & File Configuration Tests', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/agent', agentConfigRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/agent`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should locate agent.config.json and agent.prompt.md via resolveAgentFile', () => {
    const configPath = resolveAgentFile('agent.config.json');
    const promptPath = resolveAgentFile('agent.prompt.md');

    assert.ok(configPath, 'agent.config.json should be resolved');
    assert.ok(promptPath, 'agent.prompt.md should be resolved');
  });

  it('should load agent configuration and parse manifest correctly', () => {
    resetAgentConfigCache();
    const config = loadAgentConfig();

    assert.strictEqual(typeof config.name, 'string');
    assert.ok(config.name.length > 0);
    assert.strictEqual(typeof config.model, 'string');
    assert.ok(Array.isArray(config.starterPrompts));
    assert.ok(config.starterPrompts!.length > 0);
    assert.strictEqual(typeof config.temperature, 'number');
  });

  it('should load system prompt markdown from file', () => {
    resetAgentConfigCache();
    const prompt = loadSystemPrompt();

    assert.strictEqual(typeof prompt, 'string');
    assert.ok(prompt.includes('Agent Persona & Mission'));
  });

  it('GET /api/agent/config should return complete agent metadata', async () => {
    const res = await fetch(`${baseUrl}/config`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(typeof data.name, 'string');
    assert.strictEqual(typeof data.model, 'string');
    assert.strictEqual(typeof data.tagline, 'string');
    assert.ok(data.tagline.includes('starter kit') || data.tagline.length > 0);
    assert.ok(Array.isArray(data.starterPrompts));
    assert.strictEqual(typeof data.isLocked, 'boolean');
    assert.strictEqual(typeof data.hideSettings, 'boolean');
  });

  it('isLockdownActive should return true in production or when disableClientOverrides is set', () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.strictEqual(isLockdownActive(), true, 'should be active when NODE_ENV is production');

      process.env.NODE_ENV = 'development';
      // In dev, matches agent.config.json disableClientOverrides
      const config = loadAgentConfig();
      assert.strictEqual(isLockdownActive(), !!config.lockdown?.disableClientOverrides);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('orchestrator in lockdown should ignore client-supplied customPrompt and modelName overrides', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let capturedConfig: any = null;
    let capturedModel: string | null = null;

    const mockAi = {
      models: {
        generateContentStream: async (args: any) => {
          capturedConfig = args;
          capturedModel = args.model;
          return (async function* () {
            yield { text: 'Lockdown response' };
          })();
        },
      },
    };

    try {
      const orchestrator = new AgentOrchestrator({ geminiClient: mockAi });
      const events: any[] = [];

      await orchestrator.streamTurn(
        [{ id: '1', role: 'user', content: 'Testing lockdown' }],
        (event) => events.push(event),
        'TAMPERED_CLIENT_SYSTEM_PROMPT',
        'tampered-client-model'
      );

      assert.ok(capturedConfig, 'generateContentStream should be called');
      assert.strictEqual(
        capturedConfig.config.systemInstruction.includes('TAMPERED_CLIENT_SYSTEM_PROMPT'),
        false,
        'client-supplied prompt override must be ignored in lockdown'
      );
      assert.notStrictEqual(
        capturedModel,
        'tampered-client-model',
        'client-supplied model override must be ignored in lockdown'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('orchestrator should respect host contextData and inject it into system instruction', async () => {
    let capturedConfig: any = null;

    const mockAi = {
      models: {
        generateContentStream: async (args: any) => {
          capturedConfig = args;
          return (async function* () {
            yield { text: 'Response from mock agent' };
          })();
        },
      },
    };

    const orchestrator = new AgentOrchestrator({ geminiClient: mockAi });
    const events: any[] = [];

    await orchestrator.streamTurn(
      [{ id: '1', role: 'user', content: 'What is my dashboard?' }],
      (event) => events.push(event),
      undefined,
      undefined,
      { dashboardId: 'dash-999', exploreName: 'orders_explore', userRole: 'Analyst' }
    );

    assert.ok(capturedConfig, 'generateContentStream should be invoked');
    assert.ok(
      capturedConfig.config.systemInstruction.includes('[Active Host Context]'),
      'systemInstruction should include host context block'
    );
    assert.ok(
      capturedConfig.config.systemInstruction.includes('dash-999'),
      'systemInstruction should contain dashboardId'
    );
    assert.ok(
      capturedConfig.config.systemInstruction.includes('orders_explore'),
      'systemInstruction should contain exploreName'
    );
  });
});
