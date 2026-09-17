import React, { useEffect, useRef } from 'react';
import { Modal } from './Modal.js';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import styles from './Modal.module.css';

export interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  variant,
  confirmVariant,
  isLoading = false,
  icon,
  size = 'sm',
  testId = 'confirm-modal',
}) => {
  const effectiveVariant = variant || confirmVariant || 'primary';
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button on open (for easy Enter/Space confirmation)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Enter key to quickly confirm
  useEffect(() => {
    if (!isOpen || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onConfirm]);

  const defaultTitle =
    effectiveVariant === 'danger'
      ? 'Confirm Deletion'
      : effectiveVariant === 'warning'
      ? 'Warning'
      : 'Confirmation';

  const defaultConfirmText =
    effectiveVariant === 'danger' ? 'Delete' : 'Confirm';

  const renderedTitle = title || defaultTitle;
  const renderedConfirmText = confirmText || defaultConfirmText;

  // Render appropriate badge icon if not explicitly provided
  const renderedIcon =
    icon !== undefined ? (
      icon
    ) : effectiveVariant === 'danger' ? (
      <div className={`${styles.confirmIconWrapper} ${styles.confirmIconDanger}`}>
        <AlertTriangle size={20} />
      </div>
    ) : effectiveVariant === 'warning' ? (
      <div className={`${styles.confirmIconWrapper} ${styles.confirmIconWarning}`}>
        <AlertCircle size={20} />
      </div>
    ) : (
      <div className={`${styles.confirmIconWrapper} ${styles.confirmIconPrimary}`}>
        <Info size={20} />
      </div>
    );

  const confirmBtnClass =
    effectiveVariant === 'danger'
      ? 'btn btn-danger'
      : 'btn btn-primary';

  const footer = (
    <>
      <button
        type="button"
        data-testid={`${testId}-cancel-btn`}
        className="btn btn-ghost"
        onClick={onCancel}
        disabled={isLoading}
      >
        {cancelText}
      </button>

      <button
        ref={confirmBtnRef}
        type="button"
        data-testid={`${testId}-confirm-btn`}
        className={confirmBtnClass}
        onClick={onConfirm}
        disabled={isLoading}
      >
        {isLoading && <Loader2 size={14} className="spinner" />}
        <span>{renderedConfirmText}</span>
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {renderedIcon}
          <span>{renderedTitle}</span>
        </div>
      }
      footer={footer}
      size={size}
      role="alertdialog"
      closeOnEsc={!isLoading}
      closeOnOverlayClick={!isLoading}
      testId={testId}
    >
      <div className={`${styles.confirmMessage} confirm-message`}>
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
    </Modal>
  );
};
