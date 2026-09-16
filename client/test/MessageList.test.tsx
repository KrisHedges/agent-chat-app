import React from 'react';
import { describe, it, expect, vi } from 'vitest';
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

    expect(screen.getByText('Gemini AI Agent Framework')).toBeDefined();

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
});
