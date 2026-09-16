import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let genAIClient: GoogleGenAI | null = null;

export function getEffectiveApiKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || config.geminiApiKey || '').trim();
}

export function isApiKeyConfigured(): boolean {
  const key = getEffectiveApiKey();
  return key.length > 0;
}

export function getGeminiClient(): GoogleGenAI | null {
  const key = getEffectiveApiKey();
  if (!key) {
    logger.warn('[GeminiClient] No API key found in GEMINI_API_KEY or GOOGLE_API_KEY.');
    return null;
  }
  if (!genAIClient) {
    const masked = key.length > 8 ? `${key.substring(0, 6)}...${key.substring(key.length - 3)}` : '***';
    logger.log(`[GeminiClient] Initializing GoogleGenAI client with key: ${masked}`);
    genAIClient = new GoogleGenAI({ apiKey: key });
  }
  return genAIClient;
}

export function resetGeminiClientForTesting(): void {
  genAIClient = null;
}

