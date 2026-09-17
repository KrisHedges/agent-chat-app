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

  it('updates model when select dropdown changes', () => {
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
    fireEvent.change(select, { target: { value: 'gemini-3.8-pro' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      model: 'gemini-3.8-pro',
    });

    // Selecting 'custom' does not call onUpdateSettings directly
    handleUpdate.mockClear();
    fireEvent.change(select, { target: { value: 'custom' } });
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  it('updates model when typing custom model name and updates system instruction', () => {
    const handleUpdate = vi.fn();
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={initialSettings}
        onUpdateSettings={handleUpdate}
      />
    );

    const modelInput = screen.getByPlaceholderText(/Or type custom model name/i);
    fireEvent.change(modelInput, { target: { value: 'gemini-custom-exp' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      model: 'gemini-custom-exp',
    });

    const promptTextarea = screen.getByPlaceholderText(/Leave empty to use default/i);
    fireEvent.change(promptTextarea, { target: { value: 'New system instruction' } });
    expect(handleUpdate).toHaveBeenCalledWith({
      ...initialSettings,
      systemPrompt: 'New system instruction',
    });
  });

  it('falls back to custom option in select if model is unrecognized', () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        settings={{ model: 'my-experimental-model', systemPrompt: '' }}
        onUpdateSettings={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('custom');
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
});
