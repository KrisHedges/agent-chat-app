import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttachmentChip } from '../src/components/AttachmentChip.js';
import { Attachment } from '../src/types/index.js';

describe('AttachmentChip Component', () => {
  const sampleImage: Attachment = {
    id: 'att_1',
    name: 'chart.png',
    size: 2048,
    mimeType: 'image/png',
    category: 'image',
    base64Data: 'abc',
    previewUrl: 'data:image/png;base64,abc',
  };

  const sampleJson: Attachment = {
    id: 'att_2',
    name: 'data.json',
    size: 1048576, // 1 MB
    mimeType: 'application/json',
    category: 'json',
    base64Data: 'e30=',
  };

  it('renders image attachment with thumbnail and name', () => {
    render(<AttachmentChip attachment={sampleImage} />);
    expect(screen.getByText('chart.png')).toBeDefined();
    expect(screen.getByText('(2.0 KB)')).toBeDefined();

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('data:image/png;base64,abc');
  });

  it('renders non-image attachment with size formatting in MB', () => {
    render(<AttachmentChip attachment={sampleJson} />);
    expect(screen.getByText('data.json')).toBeDefined();
    expect(screen.getByText('(1.0 MB)')).toBeDefined();
  });

  it('calls onRemove when remove button is clicked', () => {
    const handleRemove = vi.fn();
    render(<AttachmentChip attachment={sampleImage} onRemove={handleRemove} />);

    const removeBtn = screen.getByLabelText('Remove attachment');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith('att_1');
  });

  it('renders image attachment without previewUrl using fallback icon', () => {
    const imgNoPreview: Attachment = {
      id: 'att_img_no_prev',
      name: 'photo.jpg',
      size: 500, // < 1024 bytes -> "500 B"
      mimeType: 'image/jpeg',
      category: 'image',
      base64Data: 'abc',
    };
    render(<AttachmentChip attachment={imgNoPreview} />);
    expect(screen.getByText('photo.jpg')).toBeDefined();
    expect(screen.getByText('(500 B)')).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders csv attachment with spreadsheet icon', () => {
    const csvAtt: Attachment = {
      id: 'att_csv',
      name: 'data.csv',
      size: 2000,
      mimeType: 'text/csv',
      category: 'csv',
      base64Data: 'a,b,c',
    };
    render(<AttachmentChip attachment={csvAtt} />);
    expect(screen.getByText('data.csv')).toBeDefined();
  });

  it('renders other attachment with fallback document icon', () => {
    const otherAtt: Attachment = {
      id: 'att_other',
      name: 'notes.txt',
      size: 1500,
      mimeType: 'text/plain',
      category: 'other',
      base64Data: 'hello',
    };
    render(<AttachmentChip attachment={otherAtt} />);
    expect(screen.getByText('notes.txt')).toBeDefined();
  });
});
