export type AttachmentCategory = 'image' | 'json' | 'csv' | 'text' | 'document';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: AttachmentCategory;
  base64Data: string;
  previewUrl?: string;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResultInfo {
  id: string;
  name: string;
  result: unknown;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  attachments?: Attachment[];
  toolCalls?: ToolCallInfo[];
  toolResults?: ToolResultInfo[];
  timestamp?: number;
  isError?: boolean;
  canRetry?: boolean;
  errorMessage?: string;
}

export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'status'; message: string }
  | { type: 'tool_call'; tool: ToolCallInfo }
  | { type: 'tool_result'; result: ToolResultInfo }
  | { type: 'error'; error: string }
  | { type: 'done'; usage?: { promptTokens?: number; candidatesTokens?: number } };

export interface AgentSettings {
  agentName?: string;
  tagline?: string;
  model: string;
  systemPrompt: string;
  starterPrompts?: string[];
  systemPromptFile?: string;
  isLocked?: boolean;
  hideSettings?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessagePreview?: string;
}
