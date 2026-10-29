import { useState, useRef, useEffect, useCallback } from 'react';

export type SpeechRecognitionErrorCode =
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'audio-capture'
  | 'not-supported'
  | 'generic';

interface UseSpeechRecognitionOptions {
  defaultLang?: 'hi-IN' | 'en-IN';
  onResult?: (finalText: string, isFinal: boolean) => void;
  onError?: (error: SpeechRecognitionErrorCode) => void;
}

export function useSpeechRecognition({
  defaultLang = 'en-IN',
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionErrorCode | null>(null);
  const [selectedLang, setSelectedLang] = useState<'hi-IN' | 'en-IN'>(defaultLang);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Sync defaultLang when it changes if not actively listening
  useEffect(() => {
    if (!isListening) {
      setSelectedLang(defaultLang);
    }
  }, [defaultLang, isListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore errors on stop
      }
    }
    setIsListening(false);
  }, []);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore errors on abort
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    (langOverride?: 'hi-IN' | 'en-IN') => {
      if (!isSupported) {
        setError('not-supported');
        onError?.('not-supported');
        return;
      }

      // If already active, abort first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }

      setError(null);
      setTranscript('');
      setInterimTranscript('');

      const RecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!RecognitionConstructor) {
        setError('not-supported');
        onError?.('not-supported');
        return;
      }

      try {
        const recognition = new RecognitionConstructor();
        const activeLang = langOverride || selectedLang;
        
        recognition.lang = activeLang;
        recognition.continuous = false; // Stop after speaking; do NOT listen continuously in background
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let accumulatedFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            const text = item[0]?.transcript || '';
            if (item.isFinal) {
              accumulatedFinal += text;
            } else {
              currentInterim += text;
            }
          }

          if (accumulatedFinal) {
            setTranscript((prev) => {
              const updated = (prev ? prev + ' ' : '') + accumulatedFinal.trim();
              onResult?.(updated, true);
              return updated;
            });
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
            onResult?.(currentInterim, false);
          } else {
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          let mappedError: SpeechRecognitionErrorCode = 'generic';

          switch (event.error) {
            case 'not-allowed':
            case 'service-not-allowed':
              mappedError = 'not-allowed';
              break;
            case 'no-speech':
              mappedError = 'no-speech';
              break;
            case 'network':
              mappedError = 'network';
              break;
            case 'audio-capture':
              mappedError = 'audio-capture';
              break;
            case 'aborted':
              // User aborted or canceled intentionally, don't show noisy error
              setIsListening(false);
              return;
            default:
              mappedError = 'generic';
          }

          setError(mappedError);
          setIsListening(false);
          onError?.(mappedError);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setError('generic');
        setIsListening(false);
        onError?.('generic');
      }
    },
    [isSupported, selectedLang, onResult, onError]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    clearError,
    isSupported,
    selectedLang,
    setSelectedLang,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
  };
}

