import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsDrawer } from '../src/components/SettingsDrawer.js';
import { AgentSettings } from '../src/types/index.js';

describe('SettingsDrawer Component', () => {
  const initialSettings: AgentSettings = {
    agentName: 'Gemini Chat Agent Starter Kit',
    model: 'gemini-3.8-flash',
    systemPrompt: 'You are a Looker advisor.',
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SettingsDrawer
        isOpen={false}
        onClose={vi.fn()}
        settings={initialSettings}
        onUpdateSettings={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when open and handles close events', () => {
    const handleClose = vi.fn();
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={handleClose}
        settings={initialSettings}
        onUpdateSettings={vi.fn()}
      />
    );

    expect(screen.getByText('Agent Configuration')).toBeDefined();

    // Click Apply & Close button
    const applyBtn = screen.getByRole('button', { name: /Apply & Close/i });
    fireEvent.click(applyBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Click overlay
    const overlay = screen.getByTestId('drawer-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Click panel stops propagation
    const panel = screen.getByTestId('drawer-panel');
    fireEvent.click(panel);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('updates model when select dropdown changes to verified models', () => {
    const handleUpdate = vi.fn();
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={initialSettings}
        onUpdateSettings={handleUpdate}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Change to gemini-3.7-flash
    fireEvent.change(select, { target: { value: 'gemini-3.7-flash' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      model: 'gemini-3.7-flash',
    });

    // Change to gemini-3.1-pro
    handleUpdate.mockClear();
    fireEvent.change(select, { target: { value: 'gemini-3.1-pro' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      model: 'gemini-3.1-pro',
    });

    // Change to gemini-2.0-flash
    handleUpdate.mockClear();
    fireEvent.change(select, { target: { value: 'gemini-2.0-flash' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      model: 'gemini-2.0-flash',
    });

    // Verify there is no text input to type arbitrary model names
    expect(screen.queryByPlaceholderText(/custom model name/i)).toBeNull();
  });

  it('updates system instruction via prompt textarea', () => {
    const handleUpdate = vi.fn();
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={initialSettings}
        onUpdateSettings={handleUpdate}
      />
    );

    const promptTextarea = screen.getByPlaceholderText(/Leave empty to use default/i);
    fireEvent.change(promptTextarea, { target: { value: 'New system instruction' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      systemPrompt: 'New system instruction',
    });
  });

  it('falls back to gemini-3.8-flash in select if model is unrecognized', () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={{ model: 'my-experimental-model', systemPrompt: '' }}
        onUpdateSettings={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('gemini-3.8-flash');
  });

  it('updates agentName when typing custom agent display name', () => {
    const handleUpdate = vi.fn();
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={initialSettings}
        onUpdateSettings={handleUpdate}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Gemini Chat Agent Starter Kit/i);
    fireEvent.change(nameInput, { target: { value: 'Looker Analytical Agent' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      agentName: 'Looker Analytical Agent',
    });
  });

  it('updates tagline when typing in tagline textarea', () => {
    const handleUpdate = vi.fn();
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={initialSettings}
        onUpdateSettings={handleUpdate}
      />
    );

    const taglineInput = screen.getByPlaceholderText(/e\.g\. A modular starter kit/i);
    fireEvent.change(taglineInput, { target: { value: 'Custom assistant tagline' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      tagline: 'Custom assistant tagline',
    });
  });

  it('renders lockdown banner and disables form inputs when isLocked is true', () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={{
          ...initialSettings,
          isLocked: true,
          systemPromptFile: 'agent.prompt.md',
        }}
        onUpdateSettings={vi.fn()}
      />
    );

    expect(screen.getByTestId('lockdown-banner')).toBeDefined();
    expect(screen.getByText('Locked by Agent Manifest')).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/e\.g\. Gemini Chat Agent Starter Kit/i) as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);

    const taglineInput = screen.getByPlaceholderText(/e\.g\. A modular starter kit/i) as HTMLTextAreaElement;
    expect(taglineInput.disabled).toBe(true);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.disabled).toBe(true);

    const textarea = screen.getByPlaceholderText(/System prompt is locked to agent\.prompt\.md/i) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });
});
