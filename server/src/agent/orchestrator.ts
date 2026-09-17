import { getGeminiClient, isApiKeyConfigured } from './gemini-client.js';
import { defaultToolRegistry, ToolRegistry } from './skills/registry.js';
import { Message, StreamEvent, Attachment } from './types.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { loadAgentConfig, loadSystemPrompt, isLockdownActive } from './agent-config.js';


export interface OrchestratorOptions {
  model?: string;
  systemPrompt?: string;
  toolRegistry?: ToolRegistry;
  geminiClient?: any;
}

export class AgentOrchestrator {
  private toolRegistry: ToolRegistry;
  private defaultModel?: string;
  private explicitSystemPrompt?: string;
  private customClient?: any;

  constructor(options: OrchestratorOptions = {}) {
    this.toolRegistry = options.toolRegistry || defaultToolRegistry;
    this.defaultModel = options.model;
    this.customClient = options.geminiClient;
    this.explicitSystemPrompt = options.systemPrompt;
  }

  /**
   * Main execution loop with streaming SSE events
   */
  async streamTurn(
    messages: Message[],
    emit: (event: StreamEvent) => void,
    customPrompt?: string,
    modelName?: string,
    contextData?: Record<string, unknown>
  ): Promise<void> {
    const isLocked = isLockdownActive();
    const agentCfg = loadAgentConfig();

    // In lockdown/production, client-supplied prompt and model overrides are strictly ignored
    const selectedModel = isLocked
      ? (this.defaultModel || agentCfg.model || config.defaultModel)
      : (modelName || this.defaultModel || agentCfg.model || config.defaultModel);

    const basePrompt = isLocked
      ? (this.explicitSystemPrompt || loadSystemPrompt())
      : (customPrompt || this.explicitSystemPrompt || loadSystemPrompt());

    // Inject active host context (e.g. Looker session, dashboard ID, user metadata)
    let systemPrompt = basePrompt;
    if (contextData && Object.keys(contextData).length > 0) {
      const contextLines = Object.entries(contextData)
        .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n');
      systemPrompt += `\n\n[Active Host Context]\n${contextLines}`;
    }

    logger.log(`[Orchestrator] isApiKeyConfigured: ${isApiKeyConfigured()}`);
    if (this.customClient === undefined && !isApiKeyConfigured()) {
      logger.log('[Orchestrator] API key not found. Sending connection instructions.');
      await this.runMockStreamingTurn(messages, emit);
      return;
    }

    const ai = this.customClient !== undefined ? this.customClient : getGeminiClient();
    if (!ai) {
      logger.error('[Orchestrator] getGeminiClient() returned null');
      emit({
        type: 'error',
        error: 'Gemini client could not be initialized. Check server GEMINI_API_KEY configuration.',
      });
      emit({ type: 'done' });
      return;
    }

    try {
      logger.log(`[Orchestrator] Calling Gemini generateContentStream with model: ${selectedModel}`);
      emit({ type: 'status', message: `Thinking with ${selectedModel}...` });

      // Transform messages to Gemini contents structure
      const contents = this.formatMessagesForGemini(messages);
      const geminiTools = this.toolRegistry.toGeminiTools();
      logger.log(`[Orchestrator] Formatted contents turns: ${contents.length} | Available tools: ${geminiTools.length}`);

      // Initiate streaming call with tools
      let shouldContinue = true;
      let iterations = 0;
      const maxIterations = 5;

      while (shouldContinue && iterations < maxIterations) {
        iterations++;
        logger.log(`[Orchestrator] Turn iteration ${iterations}/${maxIterations}`);

        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents: contents as any,
          config: {
            systemInstruction: systemPrompt,
            tools: geminiTools.length > 0 ? (geminiTools as any) : undefined,
            temperature: agentCfg.temperature ?? 0.4,
          },
        });

        let accumulatedText = '';
        let chunkIndex = 0;
        const iterationModelParts: Array<Record<string, unknown>> = [];
        const functionCallsToExecute: Array<{
          id: string;
          name: string;
          args: Record<string, unknown>;
          part: Record<string, unknown>;
        }> = [];

        for await (const chunk of responseStream) {
          chunkIndex++;
          let textPiece = '';
          try {
            textPiece = chunk.text || '';
          } catch {
            // chunk.text can throw if only functionCall is present
          }

          if (textPiece) {
            accumulatedText += textPiece;
            emit({ type: 'token', content: textPiece });
          }

          // Check for function calls and candidate parts in chunk candidates
          const candidates = chunk.candidates || [];
          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
              iterationModelParts.push(part as Record<string, unknown>);

              if ((part as any).functionCall) {
                const fc = (part as any).functionCall;
                logger.log(`[Orchestrator] Model requested tool call: ${fc.name}`);
                functionCallsToExecute.push({
                  id: fc.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  name: fc.name,
                  args: fc.args || {},
                  part: part as Record<string, unknown>,
                });
              }
            }
          }
        }

        logger.log(
          `[Orchestrator] Stream iteration ${iterations} complete: received ${chunkIndex} chunks, text length: ${accumulatedText.length}, tool calls: ${functionCallsToExecute.length}, model parts: ${iterationModelParts.length}`
        );

        // If no function calls, turn is complete
        if (functionCallsToExecute.length === 0) {
          shouldContinue = false;
          break;
        }

        // Execute all function calls emitted in this turn
        const functionResponses: Array<Record<string, unknown>> = [];

        for (const call of functionCallsToExecute) {
          emit({
            type: 'status',
            message: `Executing skill: ${call.name}...`,
          });
          emit({
            type: 'tool_call',
            tool: { id: call.id, name: call.name, args: call.args },
          });

          const tool = this.toolRegistry.get(call.name);
          let result: unknown;
          if (tool) {
            try {
              result = await tool.execute(call.args);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : String(err) };
            }
          } else {
            result = { error: `Tool ${call.name} not found in registry.` };
          }

          emit({
            type: 'tool_result',
            result: { id: call.id, name: call.name, result },
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result },
            },
          });
        }

        // Ensure thoughtSignature is preserved on all model parts for Gemini 3
        for (const part of iterationModelParts) {
          if (part.functionCall) {
            const sig =
              part.thoughtSignature ||
              (part as any).thought_signature ||
              (part.functionCall as any)?.thoughtSignature ||
              (part.functionCall as any)?.thought_signature;
            if (sig) {
              part.thoughtSignature = sig;
            }
          }
        }

        const modelParts =
          iterationModelParts.length > 0
            ? iterationModelParts
            : functionCallsToExecute.map((c) => c.part);

        // Append model's turn (with thought signatures) and user's tool response turn
        contents.push({
          role: 'model',
          parts: modelParts,
        });

        contents.push({
          role: 'user',
          parts: functionResponses,
        });
      }

      emit({ type: 'done' });
    } catch (err: unknown) {
      const fullStack = err instanceof Error ? err.stack || err.message : String(err);
      logger.error('[Orchestrator] Exception calling Gemini:', fullStack);

      const userFriendlyMessage = formatGeminiError(err);
      emit({ type: 'error', error: userFriendlyMessage });
      emit({ type: 'done' });
    }
  }

  /**
   * Formats chat messages and multi-modal attachments into Gemini Parts
   */
  private formatMessagesForGemini(messages: Message[]) {
    return messages.map((msg) => {
      const parts: Array<Record<string, unknown>> = [];

      // 1. Process attachments (Images as inlineData, JSON/CSV/Text as text blocks)
      if (msg.attachments && msg.attachments.length > 0) {
        for (const attachment of msg.attachments) {
          if (attachment.category === 'image') {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.base64Data,
              },
            });
          } else if (attachment.category === 'json' || attachment.category === 'csv' || attachment.category === 'text') {
            const decoded = Buffer.from(attachment.base64Data, 'base64').toString('utf-8');
            parts.push({
              text: `\n[Attached File: "${attachment.name}" (${attachment.category.toUpperCase()})]\n${decoded}\n[End of "${attachment.name}"]\n`,
            });
          }
        }
      }

      // 2. Add text prompt
      if (msg.content && msg.content.trim().length > 0) {
        parts.push({ text: msg.content });
      }

      // Default fallback if empty
      if (parts.length === 0) {
        parts.push({ text: ' ' });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      };
    });
  }

  /**
   * Immediate helpful response when GEMINI_API_KEY is not configured.
   */
  private async runMockStreamingTurn(messages: Message[], emit: (event: StreamEvent) => void): Promise<void> {
    const latestMessage = messages[messages.length - 1];
    const attachments = latestMessage?.attachments || [];

    let notice = `⚠️ **I am not connected to Gemini.**\n\nTo enable full LLM responses, please configure your API key:\n\n1. Open or create \`.env\` in \`server/.env\` (or the project root).\n2. Add your key: \`GEMINI_API_KEY=your_actual_key_here\`\n3. Restart the dev server (\`npm run dev\`).\n`;

    if (attachments.length > 0) {
      notice += `\n📁 *I detected ${attachments.length} attachment(s) (${attachments.map((a) => `\`${a.name}\``).join(', ')}), but I need the API key to inspect them.*`;
    }

    emit({ type: 'token', content: notice });
    emit({ type: 'done' });
  }
}

export const defaultOrchestrator = new AgentOrchestrator();

/**
 * Parses raw Gemini API errors into clean, human-friendly messages without dumping stack traces.
 */
export function formatGeminiError(err: unknown): string {
  if (!err) return 'An unexpected error occurred while communicating with Gemini.';

  const raw = err instanceof Error ? err.message : String(err);

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      let inner = parsed.error || parsed;

      // Handle double-nested JSON message string
      if (typeof inner.message === 'string' && inner.message.trim().startsWith('{')) {
        try {
          inner = JSON.parse(inner.message).error || inner;
        } catch {
          // Keep inner as is
        }
      }

      if (inner.code === 503 || String(inner.status) === 'UNAVAILABLE') {
        return 'Gemini is currently experiencing high demand (503 Service Unavailable). Spikes in demand are temporary. Please try again.';
      }
      if (inner.code === 429 || String(inner.status) === 'RESOURCE_EXHAUSTED') {
        return 'Gemini API rate limit exceeded (429). Please wait a few seconds and try again.';
      }
      if (inner.message && typeof inner.message === 'string') {
        return inner.message.split('\n')[0].replace(/^ApiError:\s*/, '');
      }
    }
  } catch {
    // If JSON parsing fails, fall back to cleaned string
  }

  const firstLine = raw.split('\n')[0].replace(/^ApiError:\s*/, '');
  return firstLine.length > 200 ? `${firstLine.slice(0, 197)}...` : firstLine;
}
