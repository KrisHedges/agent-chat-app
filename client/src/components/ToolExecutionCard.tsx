import React, { useState } from 'react';
import { ToolCallInfo, ToolResultInfo } from '../types/index.js';
import { Wrench, ChevronDown, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './ToolExecutionCard.module.css';

interface ToolExecutionCardProps {
  toolCall: ToolCallInfo;
  toolResult?: ToolResultInfo;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ toolCall, toolResult }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = Boolean(toolResult);

  return (
    <div className={`${styles.toolCard} tool-card`}>
      <div className={`${styles.toolCardHeader} tool-card-header`} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={`${styles.toolBadge} tool-badge`}>
          <Wrench size={13} />
          <span>skill: {toolCall.name}</span>
        </div>
        <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '8px' }}>
          {isCompleted ? (
            <span className={`${styles.toolStatusPill} tool-status-pill`}>
              <CheckCircle2 size={11} style={{ display: 'inline', marginRight: '4px' }} />
              Executed
            </span>
          ) : (
            <span
              className={`${styles.toolStatusPill} tool-status-pill`}
              style={{ background: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)' }}
            >
              <Loader2 size={11} className="spinner" style={{ display: 'inline', marginRight: '4px' }} />
              Running...
            </span>
          )}
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className={`${styles.toolCardBody} tool-card-body`}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Arguments:</span>
            <pre style={{ margin: '4px 0', fontSize: '11px' }}>
              <code>{JSON.stringify(toolCall.args, null, 2)}</code>
            </pre>
          </div>

          {toolResult && (
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Result:</span>
              <pre style={{ margin: '4px 0', fontSize: '11px', maxHeight: '180px', overflowY: 'auto' }}>
                <code>{JSON.stringify(toolResult.result, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
