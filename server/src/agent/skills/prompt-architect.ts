import { ToolDefinition } from '../types.js';

export interface ToolParamField {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface PromptArchitectParams {
  action: 'blueprint' | 'audit' | 'introspect' | 'scaffold_tool';
  agentName?: string;
  mission?: string;
  domain?: string;
  targetAudience?: string;
  enabledTools?: string[];
  guardrails?: string[];
  tone?: string;
  existingPrompt?: string;
  // Fields for scaffold_tool
  toolName?: string;
  toolDescription?: string;
  toolParameters?: ToolParamField[];
  sampleOutput?: Record<string, unknown>;
}

export interface ScaffoldedTool {
  toolName: string;
  fileName: string;
  code: string;
  registrySnippet: string;
  configSnippet: string;
  testSnippet: string;
  promptInstruction: string;
}

export interface PromptArchitectResult {
  action: string;
  agentPromptMd?: string;
  agentConfigSnippet?: Record<string, unknown>;
  toolGuidelines?: Array<{
    name: string;
    description: string;
    recommendedPromptInstruction: string;
  }>;
  auditReport?: {
    overallScore: number;
    strengths: string[];
    missingGuardrails: string[];
    recommendations: string[];
    improvedPromptDraft?: string;
  };
  scaffoldedTool?: ScaffoldedTool;
  summary: string;
}

function getToolPromptGuideline(name: string, description: string): string {
  switch (name) {
    case 'calculator':
      return 'Invoke `calculator` deterministically whenever mathematical equations, compound growth rates, statistical rollups, or percentages are requested. Never compute numbers in plain text.';
    case 'data_inspector':
      return 'Invoke `data_inspector` whenever the user provides or attaches structured JSON or CSV datasets. Extract schema keys, column types, null counts, and distribution ranges before drawing analytical conclusions.';
    case 'prompt_architect':
      return 'Invoke `prompt_architect` when users ask to scaffold, audit, or engineer system prompts and configurations for custom agents.';
    default:
      return `Invoke \`${name}\` to ${description.toLowerCase().replace(/\.$/, '')}. Always validate required parameters prior to execution.`;
  }
}

export const promptArchitectTool: ToolDefinition<PromptArchitectParams, PromptArchitectResult> = {
  name: 'prompt_architect',
  description:
    'Architects production-grade agent system prompts and manifest configurations. Supports generating full Markdown blueprints (agent.prompt.md + agent.config.json), auditing existing system prompts against Gemini best practices, and introspecting registered skills.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['blueprint', 'audit', 'introspect', 'scaffold_tool'],
        description:
          'Action to perform: "blueprint" to generate agent.prompt.md and agent.config.json, "audit" to evaluate an existing prompt, "introspect" to get guidelines for registered tools, or "scaffold_tool" to scaffold a new TypeScript skill.',
      },
      agentName: {
        type: 'string',
        description: 'Display name of the agent (e.g. "Looker Data Advisor", "Supply Chain Copilot").',
      },
      domain: {
        type: 'string',
        description: 'Industry, subject matter, or domain (e.g. "Business Intelligence", "E-commerce Logistics").',
      },
      mission: {
        type: 'string',
        description: 'Core objective and mission of the agent.',
      },
      targetAudience: {
        type: 'string',
        description: 'Target end-users (e.g. "Data Analysts", "Store Managers", "External Customers").',
      },
      enabledTools: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tools the agent should use (e.g. ["calculator", "data_inspector"]).',
      },
      guardrails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific dos and don\'ts, compliance requirements, or boundaries.',
      },
      tone: {
        type: 'string',
        description: 'Communication tone (e.g. "Analytical, concise, direct, and authoritative").',
      },
      existingPrompt: {
        type: 'string',
        description: 'Existing prompt text to evaluate when action is "audit".',
      },
      toolName: {
        type: 'string',
        description: 'Name of the tool to scaffold (e.g. "currency_converter", "weather_lookup").',
      },
      toolDescription: {
        type: 'string',
        description: 'Detailed description of what the tool accomplishes.',
      },
      toolParameters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Parameter name' },
            type: { type: 'string', description: 'Type (string, number, boolean, array, object)' },
            description: { type: 'string', description: 'Description of parameter' },
            required: { type: 'boolean', description: 'Whether parameter is required' },
          },
          required: ['name', 'type', 'description'],
        },
        description: 'List of parameters the tool accepts.',
      },
    },
    required: ['action'],
  },
  execute: async (params) => {
    const action = params.action || 'blueprint';

    // Lazy load registry to avoid circular load-time dependencies
    const { defaultToolRegistry } = await import('./registry.js');
    const registeredTools = defaultToolRegistry ? defaultToolRegistry.getAll() : [];

    if (action === 'scaffold_tool') {
      const rawName = params.toolName || 'custom_tool';
      const sanitizedName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const fileBaseName = sanitizedName.replace(/_/g, '-');
      const pascalName = sanitizedName
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('');
      const toolDesc =
        params.toolDescription || `Performs specialized ${sanitizedName.replace(/_/g, ' ')} operations.`;

      const propertiesObj: Record<string, any> = {};
      const requiredList: string[] = [];
      const interfaceProps: string[] = [];

      if (params.toolParameters && params.toolParameters.length > 0) {
        for (const p of params.toolParameters) {
          propertiesObj[p.name] = { type: p.type || 'string', description: p.description };
          if (p.required) requiredList.push(p.name);
          const tsType =
            p.type === 'number'
              ? 'number'
              : p.type === 'boolean'
              ? 'boolean'
              : p.type === 'array'
              ? 'unknown[]'
              : p.type === 'object'
              ? 'Record<string, unknown>'
              : 'string';
          interfaceProps.push(`  ${p.name}${p.required ? '' : '?'}: ${tsType};`);
        }
      } else {
        propertiesObj['input'] = { type: 'string', description: 'Input parameter for the tool' };
        requiredList.push('input');
        interfaceProps.push('  input: string;');
      }

      const generatedCode = `import { ToolDefinition } from '../types.js';

export interface ${pascalName}Params {
${interfaceProps.join('\n')}
}

export interface ${pascalName}Result {
  isSuccess: boolean;
  data?: Record<string, unknown> | unknown[];
  error?: string;
}

export const ${sanitizedName}Tool: ToolDefinition<${pascalName}Params, ${pascalName}Result> = {
  name: '${sanitizedName}',
  description: '${toolDesc}',
  parameters: {
    type: 'object',
    properties: ${JSON.stringify(propertiesObj, null, 6).replace(/\\"/g, '"')},
    required: ${JSON.stringify(requiredList)},
  },
  execute: async (params) => {
    try {
      // TODO: Connect to external API, database, or compute logic here
      return {
        isSuccess: true,
        data: {
          status: 'completed',
          executedAt: new Date().toISOString(),
          echo: params,
        },
      };
    } catch (err: any) {
      return {
        isSuccess: false,
        error: err?.message || 'Failed to execute ${sanitizedName}',
      };
    }
  },
};
`;

      const registrySnippet = `// In server/src/agent/skills/registry.ts:
import { ${sanitizedName}Tool } from './${fileBaseName}.js';

// In constructor():
this.register(${sanitizedName}Tool as unknown as ToolDefinition);`;

      const configSnippet = `// In agent.config.json:
"enabledSkills": [
  ...,
  "${sanitizedName}"
]`;

      const testSnippet = `// In server/test/skills.test.ts:
describe('${sanitizedName} tool', () => {
  it('should execute successfully with valid parameters', async () => {
    const { ${sanitizedName}Tool } = await import('../src/agent/skills/${fileBaseName}.js');
    const result = await ${sanitizedName}Tool.execute(${JSON.stringify(
        Object.fromEntries(
          requiredList.map((k) => [k, propertiesObj[k].type === 'number' ? 42 : 'test_value'])
        )
      )});
    assert.strictEqual(result.isSuccess, true);
  });
});`;

      const promptInstruction = `- **\`${sanitizedName}\`**: Invoke \`${sanitizedName}\` whenever the user requests ${toolDesc.toLowerCase().replace(/\.$/, '')}. Never estimate or hallucinate results without invoking this tool.`;

      return {
        action: 'scaffold_tool',
        scaffoldedTool: {
          toolName: sanitizedName,
          fileName: `server/src/agent/skills/${fileBaseName}.ts`,
          code: generatedCode,
          registrySnippet,
          configSnippet,
          testSnippet,
          promptInstruction,
        },
        summary: `Successfully scaffolded "${sanitizedName}" tool in server/src/agent/skills/${fileBaseName}.ts with registry hookup, tests, and prompt guidelines.`,
      };
    }

    if (action === 'introspect') {
      const toolGuidelines = registeredTools.map((t) => ({
        name: t.name,
        description: t.description,
        recommendedPromptInstruction: getToolPromptGuideline(t.name, t.description),
      }));

      return {
        action: 'introspect',
        toolGuidelines,
        summary: `Introspected ${toolGuidelines.length} registered tools with prompt guidelines.`,
      };
    }

    if (action === 'audit') {
      const prompt = (params.existingPrompt || '').trim();
      if (!prompt) {
        return {
          action: 'audit',
          auditReport: {
            overallScore: 0,
            strengths: [],
            missingGuardrails: ['No prompt content provided for audit.'],
            recommendations: ['Provide a non-empty system prompt string to audit.'],
          },
          summary: 'Audit failed: Empty prompt provided.',
        };
      }

      const lower = prompt.toLowerCase();
      const strengths: string[] = [];
      const missingGuardrails: string[] = [];
      const recommendations: string[] = [];
      let score = 0;

      // 1. Persona & Identity
      if (/you are|your role is|as an expert|persona/i.test(prompt)) {
        strengths.push('Defines clear agent persona and identity.');
        score += 20;
      } else {
        missingGuardrails.push('Lacks an explicit persona or role definition.');
        recommendations.push('Begin with "# Agent Persona & Mission" clearly establishing identity and authority.');
      }

      // 2. Tool Execution Rules
      if (/tool|function|calculator|data_inspector|invoke|deterministically/i.test(prompt)) {
        strengths.push('Contains explicit tool-calling or functional execution guidelines.');
        score += 20;
      } else {
        missingGuardrails.push('No instructions guiding when and how to invoke tools.');
        recommendations.push('Specify when to call deterministic tools vs generating free-text responses.');
      }

      // 3. Negative Constraints (Do NOTs)
      if (/do not|never|avoid|must not|prohibited/i.test(prompt)) {
        strengths.push('Includes explicit negative constraints ("Do NOTs") to prevent model drift.');
        score += 20;
      } else {
        missingGuardrails.push('Missing negative guardrails and boundary constraints.');
        recommendations.push('Add a "Negative Constraints" section stating what questions the agent must decline.');
      }

      // 4. Grounding & Anti-Hallucination
      if (/hallucinate|ground|accurate|unverified|factual|cite/i.test(prompt)) {
        strengths.push('Instructs model to remain strictly grounded and avoid hallucinating data.');
        score += 20;
      } else {
        missingGuardrails.push('Lacks explicit anti-hallucination and grounding directives.');
        recommendations.push('Instruct agent never to guess unverified columns, dates, or computed metrics.');
      }

      // 5. Output Formatting
      if (/markdown|table|bullet|header|code block|format/i.test(prompt)) {
        strengths.push('Specifies output formatting requirements (Markdown, tables, headers).');
        score += 20;
      } else {
        missingGuardrails.push('No output structure or formatting guidance specified.');
        recommendations.push('Instruct the agent to use GitHub-flavored Markdown, bullet points, and code blocks.');
      }

      // Generate improved draft
      const improvedPromptDraft = `# Agent Persona & Mission\n${prompt}\n\n## Operational Guardrails & Grounding\n1. **Anti-Hallucination**: Never invent unverified figures, metrics, or schema columns. Always request clarification or invoke registered tools.\n2. **Negative Constraints**: Strictly decline queries outside the agent's defined scope.\n3. **Formatting**: Always format responses in clean GitHub-flavored Markdown with structured headers and bullet points.`;

      return {
        action: 'audit',
        auditReport: {
          overallScore: score,
          strengths,
          missingGuardrails,
          recommendations,
          improvedPromptDraft,
        },
        summary: `Prompt audited with quality score ${score}/100. ${strengths.length} strengths and ${missingGuardrails.length} recommendations identified.`,
      };
    }

    // Default action: 'blueprint'
    const name = params.agentName || 'Custom Domain Agent';
    const domain = params.domain || 'Analytics & Problem Solving';
    const mission = params.mission || `Assist users with high-precision expertise in ${domain}.`;
    const audience = params.targetAudience || 'Domain professionals and business analysts';
    const tone = params.tone || 'Analytical, precise, transparent, and structured';
    const selectedTools = params.enabledTools && params.enabledTools.length > 0
      ? params.enabledTools
      : ['calculator', 'data_inspector'];

    const toolInstructions = selectedTools.map((tName) => {
      const match = registeredTools.find((t) => t.name === tName);
      return `- **\`${tName}\`**: ${getToolPromptGuideline(tName, match ? match.description : 'Specialized skill')}`;
    });

    const guardrailItems = (params.guardrails && params.guardrails.length > 0)
      ? params.guardrails.map((g) => `- ${g}`)
      : [
          '- **Negative Constraints**: Decline out-of-scope inquiries unrelated to ' + domain + '.',
          '- **Anti-Hallucination**: Never guess computed metrics or data properties. Use verified tools.',
          '- **Transparency**: Clearly explain analytical reasoning and cite data sources or tool outputs.',
        ];

    const agentPromptMd = `# Agent Persona & Mission
You are **${name}**, a specialized AI agent powered by Google Gemini.
Your core mission: ${mission}

- **Operational Domain**: ${domain}
- **Target Audience**: ${audience}
- **Communication Tone**: ${tone}

## Core Capabilities & Responsibilities
1. **Domain Expertise**: Provide accurate, authoritative guidance on ${domain}.
2. **Data & Artifact Grounding**: Thoroughly examine user-provided datasets, files, and queries before formulating conclusions.
3. **Deterministic Execution**: Rely on audited skills for all mathematical calculations and schema profiling.

## Tool Execution Rules
${toolInstructions.join('\n')}
- Preserving Context: Maintain consistency across multi-turn reasoning loops and respect tool output payloads.

## Operational Guardrails & Constraints
${guardrailItems.join('\n')}

## Response Formatting
- Format all responses in clean GitHub-flavored Markdown.
- Use bullet points, bold highlights, and markdown tables for structured data.
- Enclose code, queries, or structured JSON in syntax-highlighted code blocks.
`;

    const starterPrompts = [
      {
        title: `${domain} Analysis`,
        description: `Analyze key data and metrics within ${domain}.`,
        prompt: `Can you analyze the current performance and metrics for our ${domain.toLowerCase()} workspace?`,
        icon: 'data',
      },
      {
        title: 'Safe Calculations',
        description: 'Run verified mathematical calculations via the calculator skill.',
        prompt: 'Calculate the variance and percentage delta between our baseline and actual metrics.',
        icon: 'calculator',
      },
      {
        title: 'Skills & Capabilities',
        description: 'Explore tools and skills available to this agent.',
        prompt: `What specialized tools and capabilities do you have for ${domain.toLowerCase()}?`,
        icon: 'skills',
      },
    ];

    const agentConfigSnippet = {
      name,
      tagline: `A specialized ${name} for ${domain}, featuring audited tool execution and Gemini reasoning.`,
      model: 'gemini-3.8-flash',
      temperature: 0.2,
      systemPromptFile: 'agent.prompt.md',
      starterPrompts,
      enabledSkills: selectedTools,
      lockdown: {
        disableClientOverrides: false,
        hideSettingsInProduction: true,
      },
    };

    return {
      action: 'blueprint',
      agentPromptMd,
      agentConfigSnippet,
      summary: `Successfully generated agent blueprint for "${name}" (${domain}) with matching agent.prompt.md and agent.config.json.`,
    };
  },
};
