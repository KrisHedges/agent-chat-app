import React from 'react';
import { Attachment } from '../types/index.js';
import { FileText, FileSpreadsheet, FileCode, Image as ImageIcon, X } from 'lucide-react';
import styles from './AttachmentChip.module.css';

interface AttachmentChipProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({ attachment, onRemove, readOnly = false }) => {
  const getIcon = () => {
    switch (attachment.category) {
      case 'image':
        return <ImageIcon size={14} style={{ color: 'var(--accent-blue)' }} />;
      case 'json':
        return <FileCode size={14} style={{ color: 'var(--accent-amber)' }} />;
      case 'csv':
        return <FileSpreadsheet size={14} style={{ color: 'var(--accent-green)' }} />;
      default:
        return <FileText size={14} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`${styles.attachmentChip} attachment-chip`} title={`${attachment.name} (${formatSize(attachment.size)})`}>
      {attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className={`${styles.attachmentThumbnail} attachment-thumbnail`}
        />
      ) : (
        getIcon()
      )}
      <span className={`${styles.attachmentChipName} attachment-chip-name`}>{attachment.name}</span>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({formatSize(attachment.size)})</span>

      {!readOnly && onRemove && (
        <button
          type="button"
          className={`${styles.attachmentChipRemove} attachment-chip-remove`}
          onClick={() => onRemove(attachment.id)}
          aria-label="Remove attachment"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
