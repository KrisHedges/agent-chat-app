import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

export interface StarterPrompt {
  title: string;
  description: string;
  prompt: string;
  icon?: string;
}

export interface AgentConfig {
  name: string;
  tagline?: string;
  model: string;
  temperature?: number;
  systemPromptFile: string;
  starterPrompts?: Array<StarterPrompt | string>;
  enabledSkills?: string[];
  lockdown?: {
    disableClientOverrides?: boolean;
    hideSettingsInProduction?: boolean;
  };
}

export const DEFAULT_STARTER_PROMPTS: StarterPrompt[] = [
  {
    title: 'Data Profiling',
    description: 'Profile JSON datasets, columns, null rates, and summary statistics.',
    prompt:
      'Can you inspect this sample JSON data: [{"order_id": 101, "revenue": 240.5, "status": "completed"}, {"order_id": 102, "revenue": 180.0, "status": "pending"}]',
    icon: 'data',
  },
  {
    title: 'Skills & Tools',
    description: 'Discover registered skills and functions available to the agent.',
    prompt: 'What skills and tools do you currently have registered?',
    icon: 'skills',
  },
  {
    title: 'Safe Calculations',
    description: 'Execute verified math expressions via the calculator skill.',
    prompt:
      'Calculate the compound annual growth rate if initial is 120000 and final is 340000 over 5 years.',
    icon: 'calculator',
  },
  {
    title: 'Looker Integration',
    description: 'Learn how to connect this agent to Looker extensions and iframe URLs.',
    prompt: 'How can I embed this agent interface inside a Looker dashboard or extension?',
    icon: 'looker',
  },
];

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: 'Gemini Chat Agent Starter Kit',
  tagline:
    'A modular starter kit for building custom Gemini agents with multi-modal reasoning, audited tool execution, encrypted session persistence, and Looker extension compatibility.',
  model: 'gemini-3.8-flash',
  temperature: 0.4,
  systemPromptFile: 'agent.prompt.md',
  starterPrompts: DEFAULT_STARTER_PROMPTS,
  enabledSkills: ['calculator', 'data_inspector'],
  lockdown: {
    disableClientOverrides: false,
    hideSettingsInProduction: true,
  },
};

export const DEFAULT_SYSTEM_PROMPT = `# Agent Persona & Mission
You are an expert, proactive AI Agent powered by Google Gemini.
You assist users with data analysis, code, document inspection, visual reasoning, and problem solving.

## Operating Principles & Guidelines
1. **Clarity & Precision**: Maintain clarity, correctness, and transparency at all times.
2. **Data Inspection**: When the user attaches JSON data, CSVs, or images, inspect them thoroughly and explain key patterns or anomalies.
3. **Tool Usage**: Use available tools (e.g. data_inspector, calculator) whenever precise calculations or data profiling is required.
4. **Professionalism**: Respond with concise, well-formatted markdown.`;

// Cache records
let cachedConfig: { data: AgentConfig; mtime: number; filepath: string } | null = null;
let cachedPrompt: { content: string; mtime: number; filepath: string } | null = null;

/**
 * Searches for a configuration or prompt file starting from current directory,
 * walking upward to the workspace root.
 */
export function resolveAgentFile(filename: string): string | null {
  const searchDirs: string[] = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
  ];

  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    let dir = currentDir;
    for (let i = 0; i < 5; i++) {
      searchDirs.push(dir);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Ignore URL resolution errors in edge environments
  }

  for (const dir of searchDirs) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Loads agent configuration from agent.config.json.
 * In development, automatically reloads if the file has been modified.
 */
export function loadAgentConfig(): AgentConfig {
  const configFile = resolveAgentFile('agent.config.json');
  if (!configFile) {
    return DEFAULT_AGENT_CONFIG;
  }

  try {
    const stats = fs.statSync(configFile);
    const isDev = process.env.NODE_ENV !== 'production';

    if (cachedConfig && cachedConfig.filepath === configFile) {
      if (!isDev || stats.mtimeMs === cachedConfig.mtime) {
        return cachedConfig.data;
      }
    }

    const raw = fs.readFileSync(configFile, 'utf-8');
    const parsed = JSON.parse(raw);
    const merged: AgentConfig = {
      ...DEFAULT_AGENT_CONFIG,
      ...parsed,
      lockdown: {
        ...DEFAULT_AGENT_CONFIG.lockdown,
        ...(parsed.lockdown || {}),
      },
    };

    cachedConfig = {
      data: merged,
      mtime: stats.mtimeMs,
      filepath: configFile,
    };

    return merged;
  } catch (err) {
    logger.warn(`[AgentConfig] Failed to load ${configFile}, falling back to defaults:`, err);
    return DEFAULT_AGENT_CONFIG;
  }
}

/**
 * Loads system prompt from the configured markdown file (default: agent.prompt.md).
 * In development, re-reads automatically when modified on disk.
 */
export function loadSystemPrompt(): string {
  const agentCfg = loadAgentConfig();
  const promptFileName = agentCfg.systemPromptFile || 'agent.prompt.md';
  const promptPath = resolveAgentFile(promptFileName);

  if (!promptPath) {
    return DEFAULT_SYSTEM_PROMPT;
  }

  try {
    const stats = fs.statSync(promptPath);
    const isDev = process.env.NODE_ENV !== 'production';

    if (cachedPrompt && cachedPrompt.filepath === promptPath) {
      if (!isDev || stats.mtimeMs === cachedPrompt.mtime) {
        return cachedPrompt.content;
      }
    }

    const content = fs.readFileSync(promptPath, 'utf-8').trim();
    cachedPrompt = {
      content,
      mtime: stats.mtimeMs,
      filepath: promptPath,
    };

    return content;
  } catch (err) {
    logger.warn(`[AgentConfig] Failed to load prompt file ${promptPath}, falling back to default:`, err);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

/**
 * Checks if production lockdown or config lockdown is currently active.
 */
export function isLockdownActive(): boolean {
  const agentCfg = loadAgentConfig();
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  return !!agentCfg.lockdown?.disableClientOverrides;
}

/**
 * Resets cache (primarily for unit tests).
 */
export function resetAgentConfigCache(): void {
  cachedConfig = null;
  cachedPrompt = null;
}
