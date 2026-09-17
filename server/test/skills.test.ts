import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dataInspectorTool } from '../src/agent/skills/data-inspector.js';
import { calculatorTool } from '../src/agent/skills/calculator.js';
import { ToolRegistry } from '../src/agent/skills/registry.js';
import { Skill } from '../src/agent/types.js';

describe('Built-in Skills Tests', () => {
  describe('calculator tool', () => {
    it('should correctly evaluate basic arithmetic', async () => {
      const res = await calculatorTool.execute({ expression: '45000 / 12' });
      assert.strictEqual(res.isSuccess, true);
      assert.strictEqual(res.result, 3750);
    });

    it('should correctly evaluate expressions using Math library', async () => {
      const res = await calculatorTool.execute({ expression: 'Math.sqrt(144) * 5' });
      assert.strictEqual(res.isSuccess, true);
      assert.strictEqual(res.result, 60);

      const mathFuncs = await calculatorTool.execute({
        expression: 'Math.floor(4.9) + Math.ceil(2.1) + Math.round(5.5) + Math.abs(-10) + Math.min(3, 8) + Math.max(2, 9) + Math.pow(2, 3)',
      });
      assert.strictEqual(mathFuncs.isSuccess, true);
      assert.strictEqual(mathFuncs.result, 4 + 3 + 6 + 10 + 3 + 9 + 8);
    });

    it('should handle Math constants like PI and E', async () => {
      const res = await calculatorTool.execute({ expression: 'Math.PI * 2' });
      assert.strictEqual(res.isSuccess, true);
      assert.strictEqual(typeof res.result, 'number');
    });

    it('should return error when calculation yields NaN (e.g. 0 / 0)', async () => {
      const res = await calculatorTool.execute({ expression: '0 / 0' });
      assert.strictEqual(res.isSuccess, false);
      assert.strictEqual(res.result, 'NaN');
      assert.match(res.error || '', /valid numeric result/);
    });

    it('should safely catch syntax errors (e.g. unclosed parenthesis)', async () => {
      const res = await calculatorTool.execute({ expression: '(5 + 10 *' });
      assert.strictEqual(res.isSuccess, false);
      assert.strictEqual(res.result, 'Error');
      assert.ok(res.error);
    });

    it('should safely handle empty, missing, or disallowed inputs', async () => {
      const emptyRes = await calculatorTool.execute({ expression: '' });
      assert.strictEqual(emptyRes.isSuccess, false);

      const malicious = await calculatorTool.execute({ expression: 'process.exit(1)' });
      assert.strictEqual(malicious.isSuccess, false);
      assert.strictEqual(malicious.result, 'NaN');
    });
  });

  describe('data_inspector tool', () => {
    it('should extract columns, types, and stats from JSON array', async () => {
      const sampleData = JSON.stringify([
        { id: 1, name: 'Alice', revenue: 100, active: true },
        { id: 2, name: 'Bob', revenue: 250, active: false },
        { id: 3, name: 'Charlie', revenue: null, active: true },
      ]);

      const result = await dataInspectorTool.execute({ data: sampleData });
      assert.strictEqual(result.isParsed, true);
      assert.strictEqual(result.totalRecords, 3);
      assert.strictEqual(result.columnCount, 4);

      const revenueCol = result.columns.find((c) => c.name === 'revenue');
      assert.ok(revenueCol);
      assert.strictEqual(revenueCol?.inferredType, 'number');
      assert.strictEqual(revenueCol?.nullCount, 1);
      assert.strictEqual(revenueCol?.nonNullCount, 2);
      assert.strictEqual(revenueCol?.stats?.min, 100);
      assert.strictEqual(revenueCol?.stats?.max, 250);
      assert.strictEqual(revenueCol?.stats?.average, 175);
    });

    it('should handle single record objects and infer diverse types (datetime, boolean, array, object)', async () => {
      const singleRecord = {
        title: 'Report',
        created_at: '2026-09-16T12:00:00Z',
        is_published: true,
        tags: ['finance', 'q3'],
        metadata: { version: 1 },
        unassigned: null,
      };

      const result = await dataInspectorTool.execute({
        data: singleRecord as any,
        maxSampleValues: 2,
      });

      assert.strictEqual(result.isParsed, true);
      assert.strictEqual(result.totalRecords, 1);

      const dateCol = result.columns.find((c) => c.name === 'created_at');
      assert.strictEqual(dateCol?.inferredType, 'datetime');

      const boolCol = result.columns.find((c) => c.name === 'is_published');
      assert.strictEqual(boolCol?.inferredType, 'boolean');

      const arrayCol = result.columns.find((c) => c.name === 'tags');
      assert.strictEqual(arrayCol?.inferredType, 'array');

      const objCol = result.columns.find((c) => c.name === 'metadata');
      assert.strictEqual(objCol?.inferredType, 'object');

      const nullCol = result.columns.find((c) => c.name === 'unassigned');
      assert.strictEqual(nullCol?.inferredType, 'unknown');
    });

    it('should return empty dataset message when array has no objects (e.g. primitive array or empty)', async () => {
      const primitives = JSON.stringify([1, 2, 3]);
      const res = await dataInspectorTool.execute({ data: primitives });
      assert.strictEqual(res.isParsed, true);
      assert.strictEqual(res.totalRecords, 0);
      assert.match(res.summary, /Dataset is empty or contains no record objects/);
    });

    it('should gracefully handle empty or invalid JSON', async () => {
      const result = await dataInspectorTool.execute({ data: 'not valid json' });
      assert.strictEqual(result.isParsed, false);
      assert.strictEqual(result.totalRecords, 0);
    });

    it('should parse and profile stringified numeric values correctly', async () => {
      const records = [
        { item: 'A', cost: '12.50' },
        { item: 'B', cost: '27.50' },
      ];
      const result = await dataInspectorTool.execute({ data: records });
      assert.strictEqual(result.isParsed, true);
      const costCol = result.columns.find((c) => c.name === 'cost');
      assert.strictEqual(costCol?.inferredType, 'number');
      assert.strictEqual(costCol?.stats?.min, 12.5);
      assert.strictEqual(costCol?.stats?.max, 27.5);
      assert.strictEqual(costCol?.stats?.average, 20);
    });
  });

  describe('prompt_architect tool', () => {
    it('should generate full agent blueprint with agentPromptMd and agentConfigSnippet', async () => {
      const { promptArchitectTool } = await import('../src/agent/skills/prompt-architect.js');
      const result = await promptArchitectTool.execute({
        action: 'blueprint',
        agentName: 'Supply Chain Copilot',
        domain: 'Supply Chain Logistics',
        mission: 'Optimize warehouse stock levels and predict delivery delays',
        targetAudience: 'Logistics Coordinators',
        enabledTools: ['calculator', 'data_inspector'],
        guardrails: ['Never approve orders over $50,000 without manager confirmation.'],
        tone: 'Precise, urgent when delays detected, highly structured',
      });

      assert.strictEqual(result.action, 'blueprint');
      assert.ok(result.agentPromptMd, 'agentPromptMd should be present');
      assert.ok(result.agentPromptMd.includes('Supply Chain Copilot'));
      assert.ok(result.agentPromptMd.includes('Supply Chain Logistics'));
      assert.ok(result.agentPromptMd.includes('Never approve orders over $50,000'));
      assert.ok(result.agentPromptMd.includes('calculator'));
      assert.ok(result.agentPromptMd.includes('data_inspector'));

      assert.ok(result.agentConfigSnippet, 'agentConfigSnippet should be present');
      assert.strictEqual(result.agentConfigSnippet?.name, 'Supply Chain Copilot');
      assert.strictEqual(result.agentConfigSnippet?.model, 'gemini-3.8-flash');
      assert.strictEqual(result.agentConfigSnippet?.temperature, 0.2);
      assert.ok(Array.isArray(result.agentConfigSnippet?.starterPrompts));
      assert.strictEqual(result.agentConfigSnippet?.starterPrompts.length, 3);
    });

    it('should introspect registered tools and generate prompt guidelines', async () => {
      const { promptArchitectTool } = await import('../src/agent/skills/prompt-architect.js');
      const result = await promptArchitectTool.execute({ action: 'introspect' });

      assert.strictEqual(result.action, 'introspect');
      assert.ok(Array.isArray(result.toolGuidelines));
      assert.ok(result.toolGuidelines.length >= 3);
      assert.ok(result.toolGuidelines.some((g) => g.name === 'calculator'));
      assert.ok(result.toolGuidelines.some((g) => g.name === 'data_inspector'));
      assert.ok(result.toolGuidelines.some((g) => g.name === 'prompt_architect'));
    });

    it('should audit prompt quality and return rubric score, strengths, and recommendations', async () => {
      const { promptArchitectTool } = await import('../src/agent/skills/prompt-architect.js');

      // Test weak prompt
      const weakAudit = await promptArchitectTool.execute({
        action: 'audit',
        existingPrompt: 'Answer user queries nicely.',
      });
      assert.strictEqual(weakAudit.action, 'audit');
      assert.ok(weakAudit.auditReport);
      assert.ok(weakAudit.auditReport.overallScore < 50);
      assert.ok(weakAudit.auditReport.missingGuardrails.length > 0);
      assert.ok(weakAudit.auditReport.recommendations.length > 0);
      assert.ok(weakAudit.auditReport.improvedPromptDraft);

      // Test comprehensive prompt
      const strongAudit = await promptArchitectTool.execute({
        action: 'audit',
        existingPrompt:
          '# Agent Persona & Mission\nYou are an expert agent. Invoke calculator tool for math. Do not hallucinate unverified data. Use markdown tables and bullet formatting.',
      });
      assert.strictEqual(strongAudit.auditReport?.overallScore, 100);
      assert.strictEqual(strongAudit.auditReport?.strengths.length, 5);

      // Test empty prompt
      const emptyAudit = await promptArchitectTool.execute({
        action: 'audit',
        existingPrompt: '',
      });
      assert.strictEqual(emptyAudit.auditReport?.overallScore, 0);
    });
  });

  describe('ToolRegistry', () => {
    it('should resolve both bare tool name and prefixed tool names like default_api:calculator', async () => {
      const registry = new ToolRegistry();
      const direct = registry.get('calculator');
      assert.ok(direct);
      assert.strictEqual(direct?.name, 'calculator');

      const namespaced = registry.get('default_api:calculator');
      assert.ok(namespaced);
      assert.strictEqual(namespaced?.name, 'calculator');

      const deepNamespaced = registry.get('foo:bar:data_inspector');
      assert.ok(deepNamespaced);
      assert.strictEqual(deepNamespaced?.name, 'data_inspector');
    });

    it('should register skills and output Gemini tools format', () => {
      const registry = new ToolRegistry();
      const dummySkill: Skill = {
        name: 'custom_skill',
        description: 'Test skill',
        tools: [
          {
            name: 'custom_echo',
            description: 'Echos input',
            parameters: { type: 'object', properties: {} },
            execute: async (args) => args,
          },
        ],
      };

      registry.registerSkill(dummySkill);
      assert.ok(registry.get('custom_echo'));

      const geminiTools = registry.toGeminiTools();
      assert.strictEqual(geminiTools.length, 1);
      assert.ok(geminiTools[0].functionDeclarations.some((f: any) => f.name === 'custom_echo'));

      // Empty registry test
      const emptyRegistry = new ToolRegistry();
      (emptyRegistry as any).tools.clear();
      assert.deepStrictEqual(emptyRegistry.toGeminiTools(), []);
      assert.deepStrictEqual(emptyRegistry.getAll(), []);
    });
  });
});
