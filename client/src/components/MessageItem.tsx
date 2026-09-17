import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types/index.js';
import { AttachmentChip } from './AttachmentChip.js';
import { ToolExecutionCard } from './ToolExecutionCard.js';
import { User, AlertTriangle, RotateCcw } from 'lucide-react';
import styles from './MessageItem.module.css';

interface MessageItemProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  isLoading?: boolean;
  modelName?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry, isLoading, modelName }) => {
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
    <div
      className={`${styles.messageRow} ${
        isUser ? `${styles.messageRowUser} user` : 'agent'
      } message-row`}
    >
      <div
        className={`${styles.messageAvatar} ${
          isUser ? `${styles.messageAvatarUser} user` : `${styles.messageAvatarAgent} agent`
        } message-avatar`}
      >
        {isUser ? <User size={16} /> : <img src="/gemini.svg" alt="Gemini" width={18} height={18} style={{ display: 'block' }} />}
      </div>

      <div className={`${styles.messageContentWrapper} message-content-wrapper`}>
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
          <div
            className={`${styles.messageBubble} ${
              isUser ? styles.messageBubbleUser : styles.messageBubbleAgent
            } message-bubble`}
          >
            {displayContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            ) : (
              <span className={`${styles.thinkingShimmer} thinking-shimmer`}>
                Thinking{message.modelName || modelName ? ` with ${message.modelName || modelName}` : ''}...
              </span>
            )}
          </div>
        )}

        {/* Error Card with Try Again button */}
        {isError && (
          <div className={`${styles.messageErrorCard} message-error-card`}>
            <div className={`${styles.messageErrorHeader} message-error-header`}>
              <AlertTriangle size={15} className={`${styles.messageErrorIcon} message-error-icon`} />
              <span>Generation Error</span>
            </div>
            <div className={`${styles.messageErrorBody} message-error-body`}>
              {errorText || 'Gemini encountered a temporary service error.'}
            </div>
            {onRetry && (
              <div className={`${styles.messageErrorActions} message-error-actions`}>
                <button
                  type="button"
                  className={`${styles.btnRetry} btn-retry`}
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
