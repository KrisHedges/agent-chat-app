import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  describe('Microphone Speech-to-Text Integration', () => {
    let mockInstance: any;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onstart: (() => void) | null = null;
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;

      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();

      constructor() {
        mockInstance = this;
      }
    }

    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    afterEach(() => {
      delete (window as any).SpeechRecognition;
    });

    it('renders microphone button and starts voice input when clicked', () => {
      render(
        <InputBar
          attachments={[]}
          onAddAttachments={vi.fn()}
          onRemoveAttachment={vi.fn()}
          onSend={vi.fn()}
          isLoading={false}
        />
      );

      const micBtn = screen.getByTestId('mic-button');
      expect(micBtn.getAttribute('data-listening')).toBe('false');

      fireEvent.click(micBtn);
      expect(mockInstance.start).toHaveBeenCalled();

      // Trigger start event
      act(() => {
        mockInstance.onstart();
      });
      expect(micBtn.getAttribute('data-listening')).toBe('true');
      expect(screen.getByPlaceholderText(/Listening... Speak into your microphone/i)).toBeDefined();

      // Trigger speech result
      act(() => {
        mockInstance.onresult({
          results: [[{ transcript: 'Show me total sales' }]],
        });
      });

      const textarea = screen.getByDisplayValue('Show me total sales') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Show me total sales');

      // Click mic again to stop
      fireEvent.click(micBtn);
      expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('appends speech transcript to existing text in the input box', () => {
      render(
        <InputBar
          attachments={[]}
          onAddAttachments={vi.fn()}
          onRemoveAttachment={vi.fn()}
          onSend={vi.fn()}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask a question/i);
      fireEvent.change(textarea, { target: { value: 'Analyze data' } });

      const micBtn = screen.getByTestId('mic-button');
      fireEvent.click(micBtn);

      act(() => {
        mockInstance.onstart();
      });
      act(() => {
        mockInstance.onresult({
          results: [[{ transcript: 'for the last month' }]],
        });
      });

      expect((textarea as HTMLTextAreaElement).value).toBe('Analyze data for the last month');
    });

    it('stops listening when message is sent', () => {
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

      const micBtn = screen.getByTestId('mic-button');
      fireEvent.click(micBtn);

      act(() => {
        mockInstance.onstart();
      });

      act(() => {
        mockInstance.onresult({
          results: [[{ transcript: 'Query from voice' }]],
        });
      });

      const sendBtn = screen.getByTitle(/Send message/i);
      fireEvent.click(sendBtn);

      expect(handleSend).toHaveBeenCalledWith('Query from voice');
      expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('displays speech error in status bar when microphone permission is denied', () => {
      render(
        <InputBar
          attachments={[]}
          onAddAttachments={vi.fn()}
          onRemoveAttachment={vi.fn()}
          onSend={vi.fn()}
          isLoading={false}
        />
      );

      const micBtn = screen.getByTestId('mic-button');
      fireEvent.click(micBtn);

      act(() => {
        mockInstance.onerror({ error: 'not-allowed' });
      });

      expect(
        screen.getByText('Microphone permission was denied. Please allow microphone access.')
      ).toBeDefined();
    });
  });
});

