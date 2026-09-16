import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types/index.js';
import { AttachmentChip } from './AttachmentChip.js';
import { ToolExecutionCard } from './ToolExecutionCard.js';
import { Bot, User, AlertTriangle, RotateCcw } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  isLoading?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry, isLoading }) => {
  const isUser = message.role === 'user';

  // Check if this message represents an error or contains a service error
  const hasErrorFlag = Boolean(message.isError || message.canRetry || message.errorMessage);
  const rawContent = message.content || '';
  const containsErrorText =
    rawContent.includes('503 Service Unavailable') ||
    rawContent.includes('⚠️ Error:') ||
    rawContent.includes('⚠️ **Error') ||
    rawContent.includes('RESOURCE_EXHAUSTED');

  const isError = !isUser && (hasErrorFlag || containsErrorText);

  // Separate any text streamed prior to the error from the actual error message
  let displayContent = rawContent;
  let errorText = message.errorMessage || '';

  if (isError) {
    if (!errorText) {
      const match = rawContent.match(/⚠️\s*\*{0,2}Error:?\*{0,2}\s*([\s\S]*)/i);
      if (match) {
        errorText = match[1].trim();
        displayContent = rawContent.slice(0, match.index).trim();
      } else if (rawContent.includes('503 Service Unavailable') || rawContent.includes('ApiError:')) {
        errorText = rawContent;
        displayContent = '';
      } else {
        errorText = rawContent;
      }
    }
  }

  return (
    <div className={`message-row ${isUser ? 'user' : 'agent'}`}>
      <div className={`message-avatar ${isUser ? 'user' : 'agent'}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="message-content-wrapper">
        {/* Render Attachments if present on this message */}
        {message.attachments && message.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
            {message.attachments.map((attachment) => (
              <AttachmentChip key={attachment.id} attachment={attachment} readOnly />
            ))}
          </div>
        )}

        {/* Message Content with Markdown (if partial content was streamed before error or normal message) */}
        {(displayContent || (!message.toolCalls?.length && !isUser && !isError)) && (
          <div className="message-bubble">
            {displayContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Thinking...</span>
            )}
          </div>
        )}

        {/* Error Card with Try Again button */}
        {isError && (
          <div className="message-error-card">
            <div className="message-error-header">
              <AlertTriangle size={15} className="message-error-icon" />
              <span>Generation Error</span>
            </div>
            <div className="message-error-body">
              {errorText || 'Gemini encountered a temporary service error.'}
            </div>
            {onRetry && (
              <div className="message-error-actions">
                <button
                  type="button"
                  className="btn-retry"
                  onClick={() => onRetry(message.id)}
                  disabled={isLoading}
                  title="Retry this prompt with Gemini"
                >
                  <RotateCcw size={13} className={isLoading ? 'spinner' : ''} />
                  <span>{isLoading ? 'Retrying...' : 'Try Again'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tool Execution Cards */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {message.toolCalls.map((call) => {
              const result = message.toolResults?.find((r) => r.id === call.id || r.name === call.name);
              return <ToolExecutionCard key={call.id} toolCall={call} toolResult={result} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
