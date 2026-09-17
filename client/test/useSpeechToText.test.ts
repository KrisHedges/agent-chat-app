import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from '../src/hooks/useSpeechToText.js';

describe('useSpeechToText Hook', () => {
  let mockRecognitionInstance: any;

  class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = '';
    onstart: (() => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onend: (() => void) | null = null;

    start = vi.fn().mockImplementation(() => {
      setTimeout(() => this.onstart?.(), 0);
    });
    stop = vi.fn().mockImplementation(() => {
      setTimeout(() => this.onend?.(), 0);
    });
    abort = vi.fn().mockImplementation(() => {
      setTimeout(() => this.onend?.(), 0);
    });

    constructor() {
      mockRecognitionInstance = this;
    }
  }

  beforeEach(() => {
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = undefined;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('detects isSupported when SpeechRecognition is available in window', () => {
    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isListening).toBe(false);
  });

  it('detects when SpeechRecognition is not supported', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onError }));
    expect(result.current.isSupported).toBe(false);

    act(() => {
      result.current.startListening();
    });

    expect(result.current.error).toBe('Speech recognition is not supported in this browser.');
    expect(onError).toHaveBeenCalledWith('Speech recognition is not supported in this browser.');
  });

  it('starts listening and handles speech results', async () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onResult }));

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognitionInstance.start).toHaveBeenCalled();

    // Trigger onstart
    act(() => {
      mockRecognitionInstance.onstart?.();
    });
    expect(result.current.isListening).toBe(true);

    // Trigger onresult
    act(() => {
      mockRecognitionInstance.onresult?.({
        results: [
          [{ transcript: 'Hello ' }],
          Object.assign([{ transcript: 'world' }], { isFinal: true }),
        ],
      });
    });

    expect(result.current.transcript).toBe('Hello world');
    expect(onResult).toHaveBeenCalledWith('Hello world', true);

    // Stop listening
    act(() => {
      result.current.stopListening();
    });

    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    act(() => {
      mockRecognitionInstance.onend?.();
    });
    expect(result.current.isListening).toBe(false);
  });

  it('toggles listening state with toggleListening', () => {
    const { result } = renderHook(() => useSpeechToText());

    act(() => {
      result.current.toggleListening();
    });
    expect(mockRecognitionInstance.start).toHaveBeenCalled();

    act(() => {
      mockRecognitionInstance.onstart?.();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.toggleListening();
    });
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
  });

  it('handles permission denied (not-allowed) error', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onError }));

    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognitionInstance.onstart?.();
    });

    act(() => {
      mockRecognitionInstance.onerror?.({ error: 'not-allowed' });
    });

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBe(
      'Microphone permission was denied. Please allow microphone access.'
    );
    expect(onError).toHaveBeenCalledWith(
      'Microphone permission was denied. Please allow microphone access.'
    );
  });

  it('handles generic error and no-speech error', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onError }));

    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognitionInstance.onerror?.({ error: 'no-speech' });
    });

    expect(result.current.error).toBe('No speech detected. Please try speaking again.');

    act(() => {
      mockRecognitionInstance.onerror?.({ error: 'audio-capture' });
    });

    expect(result.current.error).toBe('Speech recognition error: audio-capture');
  });

  it('aborts on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechToText());

    act(() => {
      result.current.startListening();
    });

    unmount();
    expect(mockRecognitionInstance.abort).toHaveBeenCalled();
  });
});
