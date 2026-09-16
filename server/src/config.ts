import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or root workspace directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  defaultModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
};
