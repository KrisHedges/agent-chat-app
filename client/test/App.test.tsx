import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App.js';

describe('App Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [] }),
    });
  });

  it('renders standalone provider and chat interface in window.top context', async () => {
    render(<App />);
    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();
    expect(await screen.findByText('Local Developer')).toBeDefined();
    expect(await screen.findByText('No saved conversations yet.')).toBeDefined();
  });

  it('renders looker bridge and chat interface when isEmbedded is true', async () => {
    render(<App isEmbedded={true} />);
    expect(await screen.findByTestId('chat-toolbar')).toBeDefined();
    expect(await screen.findByText(/Looker Authenticated Session/i)).toBeDefined();
    expect(await screen.findByText('No saved conversations yet.')).toBeDefined();
  });
});
