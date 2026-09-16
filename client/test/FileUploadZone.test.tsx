import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUploadZone } from '../src/components/FileUploadZone.js';

describe('FileUploadZone Component', () => {
  it('triggers file input when attach button is clicked', () => {
    const handleFiles = vi.fn();
    render(<FileUploadZone onFilesSelected={handleFiles} />);

    const attachBtn = screen.getByTitle(/Attach image/i);
    expect(attachBtn).toBeDefined();

    // Attach click triggers the hidden input
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.click(attachBtn);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not trigger input when disabled', () => {
    render(<FileUploadZone onFilesSelected={vi.fn()} disabled={true} />);
    const attachBtn = screen.getByTitle(/Attach image/i);
    expect(attachBtn.hasAttribute('disabled')).toBe(true);
  });

  it('processes image file upload and returns base64 attachment', async () => {
    const handleFiles = vi.fn();
    render(<FileUploadZone onFilesSelected={handleFiles} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['fake-image-bytes'], 'test.png', { type: 'image/png' });

    // Mock FileReader
    class MockFileReader {
      result: any = 'data:image/png;base64,ZmFrZS1pbWFnZS1ieXRlcw==';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
      readAsText() {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }
    const origFileReader = window.FileReader;
    window.FileReader = MockFileReader as any;

    try {
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(handleFiles).toHaveBeenCalled();
      });

      const callArgs = handleFiles.mock.calls[0][0];
      expect(callArgs.length).toBe(1);
      expect(callArgs[0].name).toBe('test.png');
      expect(callArgs[0].category).toBe('image');
      expect(callArgs[0].base64Data).toBe('ZmFrZS1pbWFnZS1ieXRlcw==');
    } finally {
      window.FileReader = origFileReader;
    }
  });

  it('processes json and csv files and handles empty selection', async () => {
    const handleFiles = vi.fn();
    render(<FileUploadZone onFilesSelected={handleFiles} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Fire change with null/empty files
    fireEvent.change(input, { target: { files: [] } });
    expect(handleFiles).not.toHaveBeenCalled();

    const jsonFile = new File(['{"key": "val"}'], 'sample.json', { type: 'application/json' });
    const csvFile = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' });

    class MockFileReader {
      result: any = 'test file content';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }
    const origFileReader = window.FileReader;
    window.FileReader = MockFileReader as any;

    try {
      fireEvent.change(input, { target: { files: [jsonFile, csvFile] } });

      await waitFor(() => {
        expect(handleFiles).toHaveBeenCalled();
      });

      const callArgs = handleFiles.mock.calls[0][0];
      expect(callArgs.length).toBe(2);
      expect(callArgs[0].category).toBe('json');
      expect(callArgs[1].category).toBe('csv');
    } finally {
      window.FileReader = origFileReader;
    }
  });

  it('handles FileReader error gracefully', async () => {
    const handleFiles = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<FileUploadZone onFilesSelected={handleFiles} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    class FailingFileReader {
      error = new Error('Disk read failure');
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          this.onerror?.();
        }, 0);
      }
    }
    const origFileReader = window.FileReader;
    window.FileReader = FailingFileReader as any;

    try {
      fireEvent.change(input, { target: { files: [txtFile] } });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      expect(handleFiles).not.toHaveBeenCalled();
    } finally {
      window.FileReader = origFileReader;
      consoleError.mockRestore();
    }
  });

  it('correctly categorizes files by extension when MIME type is missing or generic', async () => {
    const handleFiles = vi.fn();
    render(<FileUploadZone onFilesSelected={handleFiles} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const jpgFile = new File(['jpg'], 'pic.jpg', { type: '' });
    const svgFile = new File(['<svg></svg>'], 'icon.svg', { type: '' });
    const jsonUntyped = new File(['{}'], 'state.json', { type: '' });
    const noExtFile = new File(['plain'], 'README', { type: '' });

    class MockReader {
      result: any = 'raw-content';
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,'; // comma with empty split
        setTimeout(() => this.onload?.(), 0);
      }
      readAsText() {
        this.result = 'text-body';
        setTimeout(() => this.onload?.(), 0);
      }
    }
    const origFileReader = window.FileReader;
    window.FileReader = MockReader as any;

    try {
      fireEvent.change(input, {
        target: { files: [jpgFile, svgFile, jsonUntyped, noExtFile] },
      });

      await waitFor(() => {
        expect(handleFiles).toHaveBeenCalled();
      });

      const attachments = handleFiles.mock.calls[0][0];
      expect(attachments.length).toBe(4);
      expect(attachments[0].category).toBe('image');
      expect(attachments[0].mimeType).toBe('image/png'); // fallback
      expect(attachments[1].category).toBe('image');
      expect(attachments[2].category).toBe('json');
      expect(attachments[2].mimeType).toBe('application/json');
      expect(attachments[3].category).toBe('text');
      expect(attachments[3].mimeType).toBe('text/plain');
    } finally {
      window.FileReader = origFileReader;
    }
  });
});

