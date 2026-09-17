import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../src/components/ChatInterface.js';
import { StandaloneProvider, LookerHostContext } from '../src/looker/StandaloneProvider.js';
import { PRESET_DEVS } from '../src/looker/user-model.js';

function createSseStream(lines: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });
}

describe('ChatInterface Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/chat/stream') {
        return {
          ok: true,
          body: createSseStream([
            'data: {"type":"token","content":"Hello response"}',
            'data: {"type":"done"}',
          ]),
        };
      }
      return {
        ok: true,
        json: async () => ({ conversations: [] }),
      };
    });
  });

  it('renders chat toolbar and handles sidebar toggling with a single toggle button', async () => {
    render(
      <StandaloneProvider>
        <ChatInterface />
      </StandaloneProvider>
    );

    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();
    expect(await screen.findByText('Dev Substitute User:')).toBeDefined();

    // Sidebar should be open initially
    expect(await screen.findByText('No saved conversations yet.')).toBeDefined();

    // Hamburger button should NOT be rendered when sidebar is open
    expect(screen.queryByTitle('Expand sidebar')).toBeNull();

    // Exactly one collapse button in the sidebar header
    const collapseBtn = screen.getByTitle('Collapse sidebar');
    fireEvent.click(collapseBtn);

    // Sidebar is closed
    const sidebar = screen.getByTestId('sidebar-container');
    expect(sidebar.getAttribute('data-open')).toBe('false');
    expect(screen.queryByTitle('Collapse sidebar')).toBeNull();

    // Hamburger button is now visible in toolbar
    const expandBtn = screen.getByTitle('Expand sidebar');
    fireEvent.click(expandBtn);

    // Sidebar is open again
    expect(sidebar.getAttribute('data-open')).toBe('true');
    expect(screen.queryByTitle('Expand sidebar')).toBeNull();
    expect(screen.getByTitle('Collapse sidebar')).toBeDefined();
  });

  it('opens and closes Settings drawer', async () => {
    render(
      <StandaloneProvider>
        <ChatInterface />
      </StandaloneProvider>
    );

    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();
    expect(screen.queryByText('Agent Configuration')).toBeNull();

    const settingsBtn = screen.getByTitle('Configure agent model and skills');
    fireEvent.click(settingsBtn);

    expect(await screen.findByText('Agent Configuration')).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /Apply & Close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Agent Configuration')).toBeNull();
  });

  it('handles drag and drop files onto the viewport', async () => {
    render(
      <StandaloneProvider>
        <ChatInterface />
      </StandaloneProvider>
    );

    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();

    const appContainer = screen.getByTestId('chat-container');

    // Drag over
    fireEvent.dragOver(appContainer);
    expect(appContainer.getAttribute('data-drag-over')).toBe('true');

    // Drag leave
    fireEvent.dragLeave(appContainer);
    expect(appContainer.getAttribute('data-drag-over')).toBe('false');

    // Setup mock FileReader
    class MockFileReader {
      result: any = 'test file content';
      onload: (() => void) | null = null;
      readAsText() {
        setTimeout(() => this.onload?.(), 0);
      }
      readAsDataURL() {
        this.result = 'data:image/png;base64,1234';
        setTimeout(() => this.onload?.(), 0);
      }
    }
    const origFileReader = window.FileReader;
    window.FileReader = MockFileReader as any;

    try {
      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [
            new File(['abc'], 'test.png', { type: 'image/png' }),
            new File(['{}'], 'data.json', { type: 'application/json' }),
            new File(['1,2'], 'data.csv', { type: 'text/csv' }),
            new File(['txt'], 'notes.txt', { type: 'text/plain' }),
          ],
        },
      };

      fireEvent.drop(appContainer, dropEvent);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeDefined();
        expect(screen.getByText('data.json')).toBeDefined();
        expect(screen.getByText('data.csv')).toBeDefined();
        expect(screen.getByText('notes.txt')).toBeDefined();
      });

      // Drop with empty files returns early
      fireEvent.drop(appContainer, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [] },
      });
    } finally {
      window.FileReader = origFileReader;
    }
  });

  it('renders Looker session in sidebar footer when isLooker is true', async () => {
    const mockContext = {
      isLooker: true,
      hostUrl: 'http://looker.internal',
      user: PRESET_DEVS[1],
      availableUsers: [PRESET_DEVS[1]],
      switchUser: vi.fn(),
      contextData: {},
      saveContextData: vi.fn(),
    };

    render(
      <LookerHostContext.Provider value={mockContext}>
        <ChatInterface />
      </LookerHostContext.Provider>
    );

    expect(await screen.findByText(/Looker Authenticated Session/i)).toBeDefined();
    expect((await screen.findAllByText(/Alice Henderson/i)).length).toBeGreaterThanOrEqual(1);
  });

  it('handles sending message from input bar and clicking starter prompt card', async () => {
    render(
      <StandaloneProvider>
        <ChatInterface />
      </StandaloneProvider>
    );

    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();

    // Click starter prompt and wait for streamed response
    const skillsPrompt = screen.getByText('Skills & Tools');
    fireEvent.click(skillsPrompt);
    expect(await screen.findByText('Hello response')).toBeDefined();

    // Wait for prompt turn to complete and textarea to re-enable
    await waitFor(() => {
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(ta.disabled).toBe(false);
    });

    // Send custom message and wait for user bubble
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Analyze Looker data' } });
    const sendBtn = screen.getByTitle(/Send message/i);
    fireEvent.click(sendBtn);
    expect(await screen.findByText('Analyze Looker data')).toBeDefined();

    // Click New Chat button in chat toolbar
    const newChatBtn = screen.getByRole('button', { name: /New Chat/i });
    fireEvent.click(newChatBtn);
    expect(await screen.findByRole('heading', { name: 'Gemini Chat Agent Starter Kit' })).toBeDefined();

    // Send message again and test Clear button
    fireEvent.change(textarea, { target: { value: 'Second question' } });
    fireEvent.click(sendBtn);
    expect(await screen.findByText('Second question')).toBeDefined();

    const clearBtn = screen.getByTitle('Clear chat messages');
    fireEvent.click(clearBtn);
    expect(await screen.findByRole('heading', { name: 'Gemini Chat Agent Starter Kit' })).toBeDefined();
  });

  it('adds attachments via InputBar file upload and supports sidebar onToggle', async () => {
    render(
      <StandaloneProvider>
        <ChatInterface />
      </StandaloneProvider>
    );

    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();

    // Toggle sidebar closed using the single collapse button in the sidebar
    const sidebarCollapseBtn = screen.getByTitle('Collapse sidebar');
    fireEvent.click(sidebarCollapseBtn);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-open')).toBe('false');

    // Setup mock FileReader for input bar attachment
    class MockFileReader {
      result: any = 'test attachment data';
      onload: (() => void) | null = null;
      readAsText() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    const origFileReader = window.FileReader;
    window.FileReader = MockFileReader as any;

    try {
      // Find the file input in InputBar (the hidden file input inside main chat layout)
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const inputBarFile = fileInputs[fileInputs.length - 1];

      fireEvent.change(inputBarFile, {
        target: {
          files: [new File(['csv content'], 'report.csv', { type: 'text/csv' })],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('report.csv')).toBeDefined();
      });
    } finally {
      window.FileReader = origFileReader;
    }
  });
});

