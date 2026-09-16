export type AttachmentCategory = 'image' | 'json' | 'csv' | 'text' | 'document';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: AttachmentCategory;
  base64Data: string; // Base64 encoded payload without data-url prefix
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
}

export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (params: TParams) => Promise<TResult> | TResult;
}

export interface Skill {
  name: string;
  description: string;
  tools: ToolDefinition[];
}

export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'status'; message: string }
  | { type: 'tool_call'; tool: ToolCallInfo }
  | { type: 'tool_result'; result: ToolResultInfo }
  | { type: 'error'; error: string }
  | { type: 'done'; usage?: { promptTokens?: number; candidatesTokens?: number } };

export interface ChatRequest {
  messages: Message[];
  model?: string;
  systemPrompt?: string;
}
