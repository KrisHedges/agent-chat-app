import React, { useRef } from 'react';
import { Attachment, AttachmentCategory } from '../types/index.js';
import { Paperclip } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFilesSelected, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const determineCategory = (file: File): AttachmentCategory => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type.toLowerCase();

    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return 'image';
    }
    if (mime === 'application/json' || ext === 'json') {
      return 'json';
    }
    if (mime === 'text/csv' || ext === 'csv') {
      return 'csv';
    }
    return 'text';
  };

  const processFile = (file: File): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const category = determineCategory(file);
      const reader = new FileReader();

      reader.onerror = () => reject(reader.error);

      if (category === 'image') {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 without data:image/...;base64, prefix
          const base64Data = result.split(',')[1] || '';
          resolve({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'image/png',
            category: 'image',
            base64Data,
            previewUrl: result,
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const textContent = reader.result as string;
          // Safely encode unicode string to base64 in browser
          const base64Data = btoa(unescape(encodeURIComponent(textContent)));
          resolve({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || (category === 'json' ? 'application/json' : 'text/plain'),
            category,
            base64Data,
          });
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const attachmentPromises: Promise<Attachment>[] = [];
    for (let i = 0; i < files.length; i++) {
      attachmentPromises.push(processFile(files[i]));
    }

    try {
      const results = await Promise.all(attachmentPromises);
      onFilesSelected(results);
    } catch (err) {
      console.error('Error reading files:', err);
    }

    // Reset input so re-selecting same file fires event
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,.json,.csv,.txt,.md"
      />
      <button
        type="button"
        className="btn btn-ghost"
        onClick={handleClick}
        disabled={disabled}
        title="Attach image, JSON dataset, CSV, or text file"
      >
        <Paperclip size={16} />
      </button>
    </>
  );
};
