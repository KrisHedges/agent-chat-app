import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolExecutionCard } from '../src/components/ToolExecutionCard.js';
import { ToolCallInfo, ToolResultInfo } from '../src/types/index.js';

describe('ToolExecutionCard Component', () => {
  const sampleCall: ToolCallInfo = {
    callId: 'call_1',
    name: 'calculator',
    args: { expression: '40 + 2' },
  };

  const sampleResult: ToolResultInfo = {
    callId: 'call_1',
    result: { value: 42 },
  };

  it('renders in running state when toolResult is absent', () => {
    render(<ToolExecutionCard toolCall={sampleCall} />);
    expect(screen.getByText('skill: calculator')).toBeDefined();
    expect(screen.getByText('Running...')).toBeDefined();
    expect(screen.queryByText('Arguments:')).toBeNull();
  });

  it('renders in executed state when toolResult is present', () => {
    render(<ToolExecutionCard toolCall={sampleCall} toolResult={sampleResult} />);
    expect(screen.getByText('Executed')).toBeDefined();
  });

  it('expands and collapses on header click, showing args and result', () => {
    render(<ToolExecutionCard toolCall={sampleCall} toolResult={sampleResult} />);
    const header = screen.getByText('skill: calculator').closest('.tool-card-header')!;

    // Click to expand
    fireEvent.click(header);
    expect(screen.getByText('Arguments:')).toBeDefined();
    expect(screen.getByText(/"expression": "40 \+ 2"/)).toBeDefined();
    expect(screen.getByText('Result:')).toBeDefined();
    expect(screen.getByText(/"value": 42/)).toBeDefined();

    // Click to collapse
    fireEvent.click(header);
    expect(screen.queryByText('Arguments:')).toBeNull();
  });

  it('expands without result when toolResult is not provided', () => {
    render(<ToolExecutionCard toolCall={sampleCall} />);
    const header = screen.getByText('skill: calculator').closest('.tool-card-header')!;

    fireEvent.click(header);
    expect(screen.getByText('Arguments:')).toBeDefined();
    expect(screen.queryByText('Result:')).toBeNull();
  });
});
