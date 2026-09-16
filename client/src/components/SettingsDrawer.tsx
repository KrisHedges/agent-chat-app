import React from 'react';
import { AgentSettings } from '../types/index.js';
import { X, Sliders, Cpu, Wrench } from 'lucide-react';
import styles from './SettingsDrawer.module.css';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentSettings;
  onUpdateSettings: (settings: AgentSettings) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="drawer-overlay"
      className={`${styles.drawerOverlay} drawer-overlay`}
      onClick={onClose}
    >
      <div
        data-testid="drawer-panel"
        className={`${styles.drawerPanel} drawer-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.drawerHeader} drawer-header`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} />
            <h2>Agent Configuration</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Model Selection */}
        <div className={`${styles.formGroup} form-group`}>
          <label>
            <Cpu size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Gemini Model
          </label>
          <select
            className={`${styles.formSelect} form-select`}
            value={
              [
                'gemini-3.8-flash',
                'gemini-3.8-pro',
                'gemini-3.5-flash',
                'gemini-3.5-pro',
                'gemini-3.0-flash',
                'gemini-3.0-pro',
                'gemini-2.5-flash',
                'gemini-2.5-pro',
              ].includes(settings.model)
                ? settings.model
                : 'custom'
            }
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                onUpdateSettings({ ...settings, model: e.target.value });
              }
            }}
          >
            <optgroup label="Gemini 3 Series (Latest)">
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Ultra-fast Multimodal)</option>
              <option value="gemini-3.8-pro">Gemini 3.8 Pro (Deep Reasoning & Analysis)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-3.5-pro">Gemini 3.5 Pro</option>
              <option value="gemini-3.0-flash">Gemini 3.0 Flash</option>
              <option value="gemini-3.0-pro">Gemini 3.0 Pro</option>
            </optgroup>
            <optgroup label="Gemini 2.5 Series">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </optgroup>
            <option value="custom">Custom / Preview Model ID...</option>
          </select>

          {/* If custom or user types custom model name */}
          <input
            type="text"
            className={`${styles.formInput} form-input`}
            style={{ marginTop: '4px' }}
            placeholder="Or type custom model name (e.g. gemini-3.8-flash)"
            value={settings.model}
            onChange={(e) => onUpdateSettings({ ...settings, model: e.target.value })}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Active model sent to @google/genai SDK.
          </span>
        </div>

        {/* Custom System Prompt */}
        <div className={`${styles.formGroup} form-group`}>
          <label>Custom System Instruction</label>
          <textarea
            className={`${styles.formTextarea} form-textarea`}
            placeholder="Leave empty to use default agent instructions..."
            value={settings.systemPrompt}
            onChange={(e) => onUpdateSettings({ ...settings, systemPrompt: e.target.value })}
            rows={5}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Defines the persona and constraints for the agent.
          </span>
        </div>

        {/* Active Skills List */}
        <div className={`${styles.formGroup} form-group`} style={{ marginTop: 'auto' }}>
          <label>
            <Wrench size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Registered Skills & Tools
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
              }}
            >
              <strong>data_inspector</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Profiles JSON datasets, schema keys, and data distributions.
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
              }}
            >
              <strong>calculator</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Evaluates math and statistics expressions deterministically.
              </div>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '10px' }}>
          Apply & Close
        </button>
      </div>
    </div>
  );
};
