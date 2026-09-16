import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StandaloneProvider, useLookerHost } from '../src/looker/StandaloneProvider.js';
import { LookerBridge } from '../src/looker/LookerBridge.js';
import { PRESET_DEVS } from '../src/looker/user-model.js';

const TestConsumer: React.FC = () => {
  const { isLooker, user, switchUser, contextData, saveContextData } = useLookerHost();
  return (
    <div>
      <span data-testid="is-looker">{isLooker ? 'yes' : 'no'}</span>
      <span data-testid="user-name">{user.name}</span>
      <span data-testid="context-dashboard">{(contextData as any).dashboardId || 'none'}</span>
      <button onClick={() => switchUser(PRESET_DEVS[1])}>Switch to Alice</button>
      <button onClick={() => saveContextData({ dashboardId: 'updated-999' })}>Update Context</button>
    </div>
  );
};

const storage: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    storage[k] = String(v);
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  },
};
Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

describe('StandaloneProvider and LookerBridge', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('provides default dev user and context in StandaloneProvider', () => {
    render(
      <StandaloneProvider>
        <TestConsumer />
      </StandaloneProvider>
    );

    expect(screen.getByTestId('is-looker').textContent).toBe('no');
    expect(screen.getByTestId('user-name').textContent).toBe('Local Developer');
    expect(screen.getByTestId('context-dashboard').textContent).toBe('mock-101');
  });

  it('switches user and persists to localStorage in StandaloneProvider', () => {
    render(
      <StandaloneProvider>
        <TestConsumer />
      </StandaloneProvider>
    );

    const switchBtn = screen.getByRole('button', { name: /Switch to Alice/i });
    fireEvent.click(switchBtn);

    expect(screen.getByTestId('user-name').textContent).toBe('Alice Henderson');
    expect(window.localStorage.getItem('gemini_agent_dev_user')).toContain('Alice Henderson');
  });

  it('loads previously stored user from localStorage', () => {
    window.localStorage.setItem('gemini_agent_dev_user', JSON.stringify(PRESET_DEVS[2]));
    render(
      <StandaloneProvider>
        <TestConsumer />
      </StandaloneProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('Bob Martinez');
  });

  it('saves context data to localStorage and updates state', async () => {
    render(
      <StandaloneProvider>
        <TestConsumer />
      </StandaloneProvider>
    );

    const updateBtn = screen.getByRole('button', { name: /Update Context/i });
    await act(async () => {
      fireEvent.click(updateBtn);
    });

    expect(screen.getByTestId('context-dashboard').textContent).toBe('updated-999');
    expect(window.localStorage.getItem('gemini_agent_dev_context')).toContain('updated-999');
  });

  it('provides Looker context in LookerBridge', () => {
    render(
      <LookerBridge>
        <TestConsumer />
      </LookerBridge>
    );

    expect(screen.getByTestId('is-looker').textContent).toBe('yes');
    expect(screen.getByTestId('user-name').textContent).toBe('Looker Active User');

    // Test dummy functions in LookerBridge (lines 20 & 22)
    const switchBtn = screen.getByRole('button', { name: /Switch to Alice/i });
    const updateBtn = screen.getByRole('button', { name: /Update Context/i });
    fireEvent.click(switchBtn);
    fireEvent.click(updateBtn);
    expect(screen.getByTestId('is-looker').textContent).toBe('yes');
  });

  it('handles corrupt JSON in dev context and setItem failures gracefully', async () => {
    // Corrupt stored context
    window.localStorage.setItem('gemini_agent_dev_context', 'INVALID_JSON_CONTENT{{{');

    render(
      <StandaloneProvider>
        <TestConsumer />
      </StandaloneProvider>
    );

    // Should fall back to default context
    expect(screen.getByTestId('context-dashboard').textContent).toBe('mock-101');

    // Mock setItem throwing error (e.g. storage full)
    const origSetItem = window.localStorage.setItem;
    window.localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    try {
      const updateBtn = screen.getByRole('button', { name: /Update Context/i });
      await act(async () => {
        fireEvent.click(updateBtn);
      });
      // Context should still update state even if setItem throws
      expect(screen.getByTestId('context-dashboard').textContent).toBe('updated-999');
    } finally {
      window.localStorage.setItem = origSetItem;
    }
  });
});

