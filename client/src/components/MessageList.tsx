import React, { useEffect, useRef } from 'react';
import { Message, StarterPrompt } from '../types/index.js';
import { MessageItem } from './MessageItem.js';
import { Sparkles, FileCode, ImageIcon, Calculator, Box } from 'lucide-react';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  onPromptClick: (text: string) => void;
  onRetry?: (messageId: string) => void;
  isLoading?: boolean;
  agentName?: string;
  tagline?: string;
  starterPrompts?: Array<StarterPrompt | string>;
}

const DEFAULT_CARDS: StarterPrompt[] = [
  {
    title: 'Data Profiling',
    description: 'Profile JSON datasets, columns, null rates, and summary statistics.',
    prompt:
      'Can you inspect this sample JSON data: [{"order_id": 101, "revenue": 240.5, "status": "completed"}, {"order_id": 102, "revenue": 180.0, "status": "pending"}]',
    icon: 'data',
  },
  {
    title: 'Skills & Tools',
    description: 'Discover registered skills and functions available to the agent.',
    prompt: 'What skills and tools do you currently have registered?',
    icon: 'skills',
  },
  {
    title: 'Safe Calculations',
    description: 'Execute verified math expressions via the calculator skill.',
    prompt:
      'Calculate the compound annual growth rate if initial is 120000 and final is 340000 over 5 years.',
    icon: 'calculator',
  },
  {
    title: 'Looker Integration',
    description: 'Learn how to connect this agent to Looker extensions and iframe URLs.',
    prompt: 'How can I embed this agent interface inside a Looker dashboard or extension?',
    icon: 'looker',
  },
];

const renderCardIcon = (icon?: string) => {
  switch (icon) {
    case 'data':
    case 'file':
    case 'code':
      return <FileCode size={15} style={{ color: 'var(--accent-amber)' }} />;
    case 'skills':
    case 'tools':
    case 'box':
      return <Box size={15} style={{ color: 'var(--accent-purple)' }} />;
    case 'calc':
    case 'calculator':
    case 'math':
      return <Calculator size={15} style={{ color: 'var(--accent-green)' }} />;
    case 'looker':
    case 'image':
    case 'chart':
      return <ImageIcon size={15} style={{ color: 'var(--accent-blue)' }} />;
    default:
      return <Sparkles size={15} style={{ color: 'var(--accent-blue)' }} />;
  }
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onPromptClick,
  onRetry,
  isLoading,
  agentName,
  tagline,
  starterPrompts,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const cards: StarterPrompt[] =
    starterPrompts && starterPrompts.length > 0
      ? starterPrompts.map((item) =>
          typeof item === 'string'
            ? { title: item, description: 'Click to ask this prompt', prompt: item, icon: 'sparkles' }
            : item
        )
      : DEFAULT_CARDS;

  if (messages.length === 0) {
    return (
      <div className={`${styles.emptyChat} empty-chat`}>
        <div className={`${styles.emptyChatIcon} empty-chat-icon`}>
          <Sparkles size={28} />
        </div>
        <h2 className={styles.emptyChatTitle}>{agentName || 'Gemini Chat Agent Starter Kit'}</h2>
        <p className={styles.emptyChatDesc}>
          {tagline ||
            'A multi-modal agent with extensible skills, real-time streaming, and Looker extension compatibility. Attach JSON files, images, or ask questions below.'}
        </p>

        <div className={`${styles.featureCards} feature-cards`}>
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`${styles.featureCard} feature-card`}
              onClick={() => onPromptClick(card.prompt)}
            >
              <div className={`${styles.featureCardHeader} feature-card-header`}>
                {renderCardIcon(card.icon)}
                <span>{card.title}</span>
              </div>
              <p>{card.description}</p>
            </div>
          ))}
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
