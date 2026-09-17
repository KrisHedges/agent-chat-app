import React, { useEffect, useRef } from 'react';
import { Message } from '../types/index.js';
import { MessageItem } from './MessageItem.js';
import { Sparkles, FileCode, ImageIcon, Calculator, Box } from 'lucide-react';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  onPromptClick: (text: string) => void;
  onRetry?: (messageId: string) => void;
  isLoading?: boolean;
  agentName?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onPromptClick,
  onRetry,
  isLoading,
  agentName,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={`${styles.emptyChat} empty-chat`}>
        <div className={`${styles.emptyChatIcon} empty-chat-icon`}>
          <Sparkles size={28} />
        </div>
        <h2 className={styles.emptyChatTitle}>{agentName || 'Gemini Chat Agent Starter Kit'}</h2>
        <p className={styles.emptyChatDesc}>
          A multi-modal agent with extensible skills, real-time streaming, and Looker extension compatibility.
          Attach JSON files, images, or ask questions below.
        </p>

        <div className={`${styles.featureCards} feature-cards`}>
          <div
            className={`${styles.featureCard} feature-card`}
            onClick={() =>
              onPromptClick(
                'Can you inspect this sample JSON data: [{"order_id": 101, "revenue": 240.5, "status": "completed"}, {"order_id": 102, "revenue": 180.0, "status": "pending"}]'
              )
            }
          >
            <div className={`${styles.featureCardHeader} feature-card-header`}>
              <FileCode size={15} style={{ color: 'var(--accent-amber)' }} />
              <span>Data Profiling</span>
            </div>
            <p>Profile JSON datasets, columns, null rates, and summary statistics.</p>
          </div>

          <div
            className={`${styles.featureCard} feature-card`}
            onClick={() => onPromptClick('What skills and tools do you currently have registered?')}
          >
            <div className={`${styles.featureCardHeader} feature-card-header`}>
              <Box size={15} style={{ color: 'var(--accent-purple)' }} />
              <span>Skills & Tools</span>
            </div>
            <p>Discover registered skills and functions available to the agent.</p>
          </div>

          <div
            className={`${styles.featureCard} feature-card`}
            onClick={() => onPromptClick('Calculate the compound annual growth rate if initial is 120000 and final is 340000 over 5 years.')}
          >
            <div className={`${styles.featureCardHeader} feature-card-header`}>
              <Calculator size={15} style={{ color: 'var(--accent-green)' }} />
              <span>Safe Calculations</span>
            </div>
            <p>Execute verified math expressions via the calculator skill.</p>
          </div>

          <div
            className={`${styles.featureCard} feature-card`}
            onClick={() =>
              onPromptClick('How can I embed this agent interface inside a Looker dashboard or extension?')
            }
          >
            <div className={`${styles.featureCardHeader} feature-card-header`}>
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
    <div className={`${styles.messageThread} message-thread`}>
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
