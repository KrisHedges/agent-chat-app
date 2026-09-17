import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '../src/components/MessageList.js';
import { Message } from '../src/types/index.js';

describe('MessageList Component', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders empty chat state with starter feature cards and handles clicks', () => {
    const handlePromptClick = vi.fn();
    render(<MessageList messages={[]} onPromptClick={handlePromptClick} />);

    expect(screen.getByText('Gemini Chat Agent Starter Kit')).toBeDefined();

    // Test Data Profiling click
    const profilingCard = screen.getByText('Data Profiling');
    fireEvent.click(profilingCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('Can you inspect this sample JSON data')
    );

    // Test Skills & Tools click
    const skillsCard = screen.getByText('Skills & Tools');
    fireEvent.click(skillsCard);
    expect(handlePromptClick).toHaveBeenCalledWith('What skills and tools do you currently have registered?');

    // Test Safe Calculations click
    const calcCard = screen.getByText('Safe Calculations');
    fireEvent.click(calcCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('Calculate the compound annual growth rate')
    );

    // Test Looker Integration click
    const lookerCard = screen.getByText('Looker Integration');
    fireEvent.click(lookerCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('How can I embed this agent interface')
    );

    // Test Prompt Architect click
    const architectCard = screen.getByText('Prompt Architect');
    fireEvent.click(architectCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('Help me architect a production system prompt')
    );

    // Test Prompt Audit click
    const auditCard = screen.getByText('Prompt Audit');
    fireEvent.click(auditCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('Can you audit and improve an existing system prompt')
    );

    // Test Build Custom Skill click
    const skillCard = screen.getByText('Build Custom Skill');
    fireEvent.click(skillCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('I want to build a new custom skill for my agent')
    );

    // Test App Customization click
    const customCard = screen.getByText('App Customization');
    fireEvent.click(customCard);
    expect(handlePromptClick).toHaveBeenCalledWith(
      expect.stringContaining('How do I customize this application?')
    );
  });

  it('renders messages and scrolls to bottom', () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    const messages: Message[] = [
      { id: '1', role: 'user', content: 'First message', timestamp: 1000 },
      { id: '2', role: 'model', content: 'Second message', timestamp: 2000 },
    ];

    render(<MessageList messages={messages} onPromptClick={vi.fn()} />);

    expect(screen.getByText('First message')).toBeDefined();
    expect(screen.getByText('Second message')).toBeDefined();
    expect(scrollMock).toHaveBeenCalled();
  });

  it('renders custom agentName when provided in props', () => {
    render(<MessageList messages={[]} onPromptClick={vi.fn()} agentName="Custom Analytical Agent" />);
    expect(screen.getByText('Custom Analytical Agent')).toBeDefined();
  });

  it('renders custom starterPrompts as feature cards and triggers onPromptClick when clicked', () => {
    const handlePromptClick = vi.fn();
    const starterPrompts = [
      {
        title: 'Custom Revenue Analysis',
        description: 'Deep dive into revenue trends',
        prompt: 'Analyze quarterly revenue trends in detail',
        icon: 'data',
      },
      {
        title: 'Retention Check',
        description: 'Inspect churned accounts',
        prompt: 'Find churned accounts for last month',
        icon: 'skills',
      },
    ];

    render(
      <MessageList
        messages={[]}
        onPromptClick={handlePromptClick}
        starterPrompts={starterPrompts}
      />
    );

    expect(screen.getByText('Custom Revenue Analysis')).toBeDefined();
    expect(screen.getByText('Deep dive into revenue trends')).toBeDefined();
    expect(screen.getByText('Retention Check')).toBeDefined();
    expect(screen.getByText('Inspect churned accounts')).toBeDefined();

    fireEvent.click(screen.getByText('Custom Revenue Analysis'));
    expect(handlePromptClick).toHaveBeenCalledWith('Analyze quarterly revenue trends in detail');
  });

  it('renders custom tagline when provided, and falls back to default starter kit tagline when omitted', () => {
    const { rerender } = render(
      <MessageList messages={[]} onPromptClick={vi.fn()} tagline="Custom Enterprise AI Tagline" />
    );
    expect(screen.getByText('Custom Enterprise AI Tagline')).toBeDefined();

    rerender(<MessageList messages={[]} onPromptClick={vi.fn()} tagline={undefined} />);
    expect(
      screen.getByText(/A modular starter kit for building custom Gemini agents/i)
    ).toBeDefined();
  });

  it('handles string array starter prompts and default icon fallback', () => {
    const handlePromptClick = vi.fn();
    render(
      <MessageList
        messages={[]}
        onPromptClick={handlePromptClick}
        starterPrompts={['Simple prompt 1', { title: 'Special', description: 'Desc', prompt: 'Prompt 2', icon: 'unknown_icon' as any }]}
      />
    );

    expect(screen.getByText('Simple prompt 1')).toBeDefined();
    expect(screen.getByText('Click to ask this prompt')).toBeDefined();
    expect(screen.getByText('Special')).toBeDefined();

    fireEvent.click(screen.getByText('Simple prompt 1'));
    expect(handlePromptClick).toHaveBeenCalledWith('Simple prompt 1');
  });
});

