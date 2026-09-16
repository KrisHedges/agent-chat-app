import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types/index.js';
import { AttachmentChip } from './AttachmentChip.js';
import { FileUploadZone } from './FileUploadZone.js';
import { Send, Loader2, AlertCircle } from 'lucide-react';

interface InputBarProps {
  attachments: Attachment[];
  onAddAttachments: (attachments: Attachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  statusMessage?: string | null;
}

export const InputBar: React.FC<InputBarProps> = ({
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onSend,
  isLoading,
  statusMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) {
      return;
    }
    onSend(inputText);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="input-container">
      {/* Active Attachment Tray */}
      {attachments.length > 0 && (
        <div className="attachment-tray">
          {attachments.map((att) => (
            <AttachmentChip key={att.id} attachment={att} onRemove={onRemoveAttachment} />
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="input-box-wrapper">
        <FileUploadZone onFilesSelected={onAddAttachments} disabled={isLoading} />

        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder={
            attachments.length > 0
              ? 'Ask about the attached file(s) or add your instructions...'
              : 'Ask a question, request data analysis, or drag & drop files here...'
          }
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleSubmit()}
          disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
          title="Send message (Enter)"
        >
          {isLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        </button>
      </div>

      {/* Real-time Status Indicator */}
      {statusMessage && (
        <div className={`status-bar ${statusMessage.toLowerCase().includes('error') ? 'error' : ''}`}>
          {statusMessage.toLowerCase().includes('error') ? (
            <AlertCircle size={12} style={{ color: '#ff7b72' }} />
          ) : (
            <Loader2 size={12} className="spinner" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
