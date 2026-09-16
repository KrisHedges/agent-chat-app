import React from 'react';
import { Attachment } from '../types/index.js';
import { FileText, FileSpreadsheet, FileCode, Image as ImageIcon, X } from 'lucide-react';

interface AttachmentChipProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({ attachment, onRemove, readOnly = false }) => {
  const getIcon = () => {
    switch (attachment.category) {
      case 'image':
        return <ImageIcon size={14} className="text-blue-400" />;
      case 'json':
        return <FileCode size={14} className="text-amber-400" />;
      case 'csv':
        return <FileSpreadsheet size={14} className="text-green-400" />;
      default:
        return <FileText size={14} className="text-gray-400" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="attachment-chip" title={`${attachment.name} (${formatSize(attachment.size)})`}>
      {attachment.previewUrl ? (
        <img src={attachment.previewUrl} alt={attachment.name} className="attachment-thumbnail" />
      ) : (
        getIcon()
      )}
      <span className="attachment-chip-name">{attachment.name}</span>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({formatSize(attachment.size)})</span>

      {!readOnly && onRemove && (
        <button
          type="button"
          className="attachment-chip-remove"
          onClick={() => onRemove(attachment.id)}
          aria-label="Remove attachment"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
