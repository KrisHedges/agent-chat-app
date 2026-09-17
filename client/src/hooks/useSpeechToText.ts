import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseSpeechToTextOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  lang?: string;
  continuous?: boolean;
}

export interface UseSpeechToTextResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  error: string | null;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore if already inactive
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const msg = 'Speech recognition is not supported in this browser.';
      setError(msg);
      optionsRef.current.onError?.(msg);
      return;
    }

    // Abort existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = optionsRef.current.continuous ?? true;
      recognition.interimResults = true;
      recognition.lang =
        optionsRef.current.lang ||
        (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res[0]?.transcript) {
            fullTranscript += res[0].transcript;
          }
          if (res.isFinal) {
            isFinal = true;
          }
        }

        setTranscript(fullTranscript);
        optionsRef.current.onResult?.(fullTranscript, isFinal);
      };

      recognition.onerror = (event: any) => {
        const errorType = event?.error;
        let errorMsg = `Speech recognition error: ${errorType}`;
        if (errorType === 'not-allowed') {
          errorMsg = 'Microphone permission was denied. Please allow microphone access.';
        } else if (errorType === 'no-speech') {
          errorMsg = 'No speech detected. Please try speaking again.';
        }
        setError(errorMsg);
        setIsListening(false);
        optionsRef.current.onError?.(errorMsg);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      const msg = err?.message || 'Failed to start speech recognition';
      setError(msg);
      setIsListening(false);
      optionsRef.current.onError?.(msg);
    }
  }, [isSupported]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up recognition instance when hook unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    error,
  };
}
