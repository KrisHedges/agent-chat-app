import React, { useEffect, useRef } from 'react';
import { Message } from '../types/index.js';
import { MessageItem } from './MessageItem.js';
import { Sparkles, FileCode, ImageIcon, Calculator, Box } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  onPromptClick: (text: string) => void;
  onRetry?: (messageId: string) => void;
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onPromptClick,
  onRetry,
  isLoading,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="empty-chat">
        <div className="empty-chat-icon">
          <Sparkles size={28} />
        </div>
        <h2>Gemini AI Agent Framework</h2>
        <p>
          A multi-modal agent with extensible skills, real-time streaming, and Looker extension compatibility.
          Attach JSON files, images, or ask questions below.
        </p>

        <div className="feature-cards">
          <div
            className="feature-card"
            onClick={() =>
              onPromptClick(
                'Can you inspect this sample JSON data: [{"order_id": 101, "revenue": 240.5, "status": "completed"}, {"order_id": 102, "revenue": 180.0, "status": "pending"}]'
              )
            }
          >
            <div className="feature-card-header">
              <FileCode size={15} style={{ color: 'var(--accent-amber)' }} />
              <span>Data Profiling</span>
            </div>
            <p>Profile JSON datasets, columns, null rates, and summary statistics.</p>
          </div>

          <div
            className="feature-card"
            onClick={() => onPromptClick('What skills and tools do you currently have registered?')}
          >
            <div className="feature-card-header">
              <Box size={15} style={{ color: 'var(--accent-purple)' }} />
              <span>Skills & Tools</span>
            </div>
            <p>Discover registered skills and functions available to the agent.</p>
          </div>

          <div
            className="feature-card"
            onClick={() => onPromptClick('Calculate the compound annual growth rate if initial is 120000 and final is 340000 over 5 years.')}
          >
            <div className="feature-card-header">
              <Calculator size={15} style={{ color: 'var(--accent-green)' }} />
              <span>Safe Calculations</span>
            </div>
            <p>Execute verified math expressions via the calculator skill.</p>
          </div>

          <div
            className="feature-card"
            onClick={() =>
              onPromptClick('How can I embed this agent interface inside a Looker dashboard or extension?')
            }
          >
            <div className="feature-card-header">
              <ImageIcon size={15} style={{ color: 'var(--accent-blue)' }} />
              <span>Looker Integration</span>
            </div>
            <p>Learn how to connect this agent to Looker extensions and iframe URLs.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-thread">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onRetry={onRetry}
          isLoading={isLoading}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
