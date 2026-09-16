import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputBar } from '../src/components/InputBar.js';
import { Attachment } from '../src/types/index.js';

describe('InputBar Component', () => {
  const sampleAttachment: Attachment = {
    id: 'att_1',
    name: 'test.json',
    size: 200,
    mimeType: 'application/json',
    category: 'json',
  };

  it('handles typing and sending a message via button click', () => {
    const handleSend = vi.fn();
    render(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Hello Gemini' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('Hello Gemini');

    const sendBtn = screen.getByTitle(/Send message/i);
    expect(sendBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(sendBtn);

    expect(handleSend).toHaveBeenCalledWith('Hello Gemini');
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('sends message on Enter key without shiftKey', () => {
    const handleSend = vi.fn();
    render(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Query on enter' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(handleSend).toHaveBeenCalledWith('Query on enter');
  });

  it('does not send message on Shift+Enter', () => {
    const handleSend = vi.fn();
    render(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Multi\nline' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('allows sending when text is empty but attachments are present', () => {
    const handleSend = vi.fn();
    render(
      <InputBar
        attachments={[sampleAttachment]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={handleSend}
        isLoading={false}
      />
    );

    const sendBtn = screen.getByTitle(/Send message/i);
    expect(sendBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(sendBtn);

    expect(handleSend).toHaveBeenCalledWith('');
  });

  it('renders attachment chips and calls onRemoveAttachment', () => {
    const handleRemove = vi.fn();
    render(
      <InputBar
        attachments={[sampleAttachment]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={handleRemove}
        onSend={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('test.json')).toBeDefined();
    const removeBtn = screen.getByLabelText('Remove attachment');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith('att_1');
  });

  it('disables input and send button when isLoading is true', () => {
    render(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={vi.fn()}
        isLoading={true}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask a question/i);
    expect(textarea.hasAttribute('disabled')).toBe(true);

    const sendBtn = screen.getByTitle(/Send message/i);
    expect(sendBtn.hasAttribute('disabled')).toBe(true);
  });

  it('renders normal statusMessage and error statusMessage', () => {
    const { rerender } = render(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={vi.fn()}
        isLoading={true}
        statusMessage="Invoking calculator..."
      />
    );

    expect(screen.getByText('Invoking calculator...')).toBeDefined();

    rerender(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={vi.fn()}
        isLoading={false}
        statusMessage="Error: network timeout"
      />
    );

    expect(screen.getByText('Error: network timeout')).toBeDefined();
  });

  it('ignores submit when text is empty and attachments are empty or when loading', () => {
    const handleSend = vi.fn();
    render(
      <InputBar
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSend={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask a question/i);
    // Press Enter on empty textarea
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(handleSend).not.toHaveBeenCalled();

    // Submit form directly
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
      expect(handleSend).not.toHaveBeenCalled();
    }
  });
});

