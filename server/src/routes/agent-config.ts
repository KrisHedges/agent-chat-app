import { Router, Request, Response } from 'express';
import { loadAgentConfig, loadSystemPrompt, isLockdownActive } from '../agent/agent-config.js';

export const agentConfigRouter = Router();

agentConfigRouter.get('/config', (_req: Request, res: Response) => {
  const agentCfg = loadAgentConfig();
  const isLocked = isLockdownActive();
  const isProd = process.env.NODE_ENV === 'production';

  res.json({
    name: agentCfg.name,
    tagline: agentCfg.tagline,
    model: agentCfg.model,
    temperature: agentCfg.temperature ?? 0.4,
    starterPrompts: agentCfg.starterPrompts || [],
    enabledSkills: agentCfg.enabledSkills || [],
    systemPromptFile: agentCfg.systemPromptFile,
    systemPrompt: isLocked ? undefined : loadSystemPrompt(),
    isLocked,
    hideSettings: isProd ? (agentCfg.lockdown?.hideSettingsInProduction ?? true) : false,
    environment: isProd ? 'production' : 'development',
  });
});
