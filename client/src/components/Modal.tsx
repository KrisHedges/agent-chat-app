import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  testId?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  role = 'dialog',
  ariaLabel,
  className = '',
  panelClassName = '',
  testId = 'modal',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substring(2, 9)}`);
  const subtitleId = useRef(`modal-desc-${Math.random().toString(36).substring(2, 9)}`);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Focus trap / initial focus on panel or first button
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass =
    size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      data-testid={`${testId}-overlay`}
      className={`${styles.modalOverlay} modal-overlay ${className}`}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        aria-describedby={subtitle ? subtitleId.current : undefined}
        aria-label={!title && ariaLabel ? ariaLabel : undefined}
        tabIndex={-1}
        data-testid={`${testId}-panel`}
        className={`${styles.modalPanel} ${sizeClass} modal-panel ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className={`${styles.modalHeader} modal-header`}>
            <div className={styles.headerContent}>
              {icon && <span className={styles.headerIcon}>{icon}</span>}
              <div className={styles.headerText}>
                {title && (
                  <h3 id={titleId.current} className={`${styles.modalTitle} modal-title`}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p id={subtitleId.current} className={`${styles.modalSubtitle} modal-subtitle`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                data-testid={`${testId}-close-button`}
                className={`${styles.closeBtn} close-btn`}
                onClick={onClose}
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        {children && <div className={`${styles.modalBody} modal-body`}>{children}</div>}

        {/* Modal Footer */}
        {footer && <div className={`${styles.modalFooter} modal-footer`}>{footer}</div>}
      </div>
    </div>
  );
};

export { ConfirmModal } from './ConfirmModal.js';
export type { ConfirmModalProps } from './ConfirmModal.js';
