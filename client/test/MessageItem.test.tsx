import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageItem } from '../src/components/MessageItem.js';
import { Message } from '../src/types/index.js';

describe('MessageItem Component', () => {
  it('renders user message with text and attachments', () => {
    const userMsg: Message = {
      id: 'm_1',
      role: 'user',
      content: 'Hello, what is Looker?',
      timestamp: Date.now(),
      attachments: [
        {
          id: 'att_1',
          name: 'doc.txt',
          size: 100,
          mimeType: 'text/plain',
          category: 'other',
        },
      ],
    };

    render(<MessageItem message={userMsg} />);
    expect(screen.getByText('Hello, what is Looker?')).toBeDefined();
    expect(screen.getByText('doc.txt')).toBeDefined();
  });

  it('renders agent thinking state when content is empty and no tools', () => {
    const thinkingMsg: Message = {
      id: 'm_think',
      role: 'model',
      content: '',
      timestamp: Date.now(),
    };

    render(<MessageItem message={thinkingMsg} />);
    expect(screen.getByText('Thinking...')).toBeDefined();
  });

  it('renders agent error card with retry button and calls onRetry', () => {
    const handleRetry = vi.fn();
    const errorMsg: Message = {
      id: 'm_err',
      role: 'model',
      content: '',
      isError: true,
      canRetry: true,
      errorMessage: 'Quota exceeded for gemini-3.8-pro',
      timestamp: Date.now(),
    };

    render(<MessageItem message={errorMsg} onRetry={handleRetry} isLoading={false} />);
    expect(screen.getByText('Generation Error')).toBeDefined();
    expect(screen.getByText('Quota exceeded for gemini-3.8-pro')).toBeDefined();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledWith('m_err');
  });

  it('renders disabled retrying button when isLoading is true', () => {
    const errorMsg: Message = {
      id: 'm_err2',
      role: 'model',
      content: '',
      isError: true,
      timestamp: Date.now(),
    };

    render(<MessageItem message={errorMsg} onRetry={vi.fn()} isLoading={true} />);
    const retryBtn = screen.getByRole('button', { name: /retrying/i });
    expect(retryBtn.hasAttribute('disabled')).toBe(true);
  });

  it('extracts error from raw ⚠️ Error: markdown content', () => {
    const rawErrorMsg: Message = {
      id: 'm_raw_err',
      role: 'model',
      content: 'Here is some partial work.\n\n⚠️ **Error:** Backend crashed',
      timestamp: Date.now(),
    };

    render(<MessageItem message={rawErrorMsg} />);
    expect(screen.getByText(/Here is some partial work\./)).toBeDefined();
    expect(screen.getByText('Generation Error')).toBeDefined();
    expect(screen.getByText('Backend crashed')).toBeDefined();
  });

  it('extracts error from 503 Service Unavailable raw text', () => {
    const serviceErrorMsg: Message = {
      id: 'm_503',
      role: 'model',
      content: '503 Service Unavailable: High load',
      timestamp: Date.now(),
    };

    render(<MessageItem message={serviceErrorMsg} />);
    expect(screen.getByText('Generation Error')).toBeDefined();
    expect(screen.getByText('503 Service Unavailable: High load')).toBeDefined();
  });

  it('extracts error from RESOURCE_EXHAUSTED fallback', () => {
    const quotaMsg: Message = {
      id: 'm_quota',
      role: 'model',
      content: 'GoogleGenAIError: RESOURCE_EXHAUSTED',
      timestamp: Date.now(),
    };

    render(<MessageItem message={quotaMsg} />);
    expect(screen.getByText('Generation Error')).toBeDefined();
    expect(screen.getAllByText('GoogleGenAIError: RESOURCE_EXHAUSTED').length).toBeGreaterThanOrEqual(1);
  });

  it('renders tool calls and matching tool results', () => {
    const toolMsg: Message = {
      id: 'm_tool',
      role: 'model',
      content: 'Calculating...',
      timestamp: Date.now(),
      toolCalls: [
        {
          id: 'call_calc_1',
          name: 'calculator',
          args: { expression: '10 * 10' },
        },
      ],
      toolResults: [
        {
          id: 'call_calc_1',
          name: 'calculator',
          result: { value: 100 },
        },
      ],
    };

    render(<MessageItem message={toolMsg} />);
    expect(screen.getByText('skill: calculator')).toBeDefined();
    expect(screen.getByText('Executed')).toBeDefined();
  });

  it('matches tool results by name when id does not match call id', () => {
    const toolMsg: Message = {
      id: 'm_tool2',
      role: 'model',
      content: 'Running analysis...',
      timestamp: Date.now(),
      toolCalls: [
        {
          id: 'call_data_1',
          name: 'data_inspector',
          args: { dataset: '[]' },
        },
      ],
      toolResults: [
        {
          id: 'different_id',
          name: 'data_inspector',
          result: { columns: [] },
        },
      ],
    };

    render(<MessageItem message={toolMsg} />);
    expect(screen.getByText('skill: data_inspector')).toBeDefined();
    expect(screen.getByText('Executed')).toBeDefined();
  });

  it('renders gemini icon avatar for agent messages', () => {
    const agentMsg: Message = {
      id: 'm_agent',
      role: 'model',
      content: 'Hello! How can I help you today?',
      timestamp: Date.now(),
    };

    render(<MessageItem message={agentMsg} />);
    const geminiImg = screen.getByAltText('Gemini');
    expect(geminiImg).toBeDefined();
    expect(geminiImg.getAttribute('src')).toBe('/gemini.svg');
  });
});

