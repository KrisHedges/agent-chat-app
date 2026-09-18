import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types/index.js';
import { AttachmentChip } from './AttachmentChip.js';
import { FileUploadZone } from './FileUploadZone.js';
import { Send, Loader2, AlertCircle, Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText.js';
import styles from './InputBar.module.css';

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
  const baseTextRef = useRef('');

  const {
    isSupported: isSpeechSupported,
    isListening,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechToText({
    onResult: (spokenTranscript) => {
      const prefix = baseTextRef.current;
      setInputText(prefix ? `${prefix}${spokenTranscript}` : spokenTranscript);
    },
  });

  const [showListeningTooltip, setShowListeningTooltip] = useState(false);

  useEffect(() => {
    if (isListening) {
      setShowListeningTooltip(true);
      const timer = setTimeout(() => setShowListeningTooltip(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowListeningTooltip(false);
    }
  }, [isListening]);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      const current = inputText.trim();
      baseTextRef.current = current ? `${current} ` : '';
      startListening();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) {
      return;
    }
    if (isListening) {
      stopListening();
    }
    onSend(inputText);
    setInputText('');
    baseTextRef.current = '';
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
    <div className={`${styles.inputContainer} input-container`}>
      {/* Active Attachment Tray */}
      {attachments.length > 0 && (
        <div className="attachment-tray">
          {attachments.map((att) => (
            <AttachmentChip key={att.id} attachment={att} onRemove={onRemoveAttachment} />
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className={`${styles.inputBoxWrapper} input-box-wrapper`}>
        <FileUploadZone onFilesSelected={onAddAttachments} disabled={isLoading} />

        <textarea
          ref={textareaRef}
          className={`${styles.chatTextarea} chat-textarea`}
          placeholder={
            isListening
              ? 'Listening... Speak into your microphone...'
              : attachments.length > 0
              ? 'Ask about the attached file(s) or add your instructions...'
              : 'Ask a question, request data analysis, or drag & drop files here...'
          }
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <div className={styles.micWrapper}>
          {showListeningTooltip && (
            <div className={styles.micTooltip} role="status">
              Listening...
            </div>
          )}
          <button
            type="button"
            data-testid="mic-button"
            data-listening={isListening}
            className={`${styles.micBtn} ${isListening ? styles.micBtnActive : ''} btn`}
            onClick={handleMicClick}
            disabled={isLoading}
            title={
              !isSpeechSupported
                ? 'Speech recognition is not supported in this browser'
                : isListening
                ? 'Listening... Click to stop voice input'
                : 'Voice input (Speech to text)'
            }
            aria-label={
              !isSpeechSupported
                ? 'Speech recognition not supported'
                : isListening
                ? 'Stop voice input'
                : 'Start voice input'
            }
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>

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

      {/* Floating Error Toast positioned above input bar so prompt container height remains constant */}
      {(speechError || (statusMessage && statusMessage.toLowerCase().includes('error'))) && (
        <div
          data-testid="input-status-bar"
          className={`${styles.floatingErrorToast} status-bar error`}
          role="alert"
        >
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>
            {statusMessage?.toLowerCase().includes('error') ? statusMessage : speechError}
          </span>
        </div>
      )}
    </div>
  );
};
