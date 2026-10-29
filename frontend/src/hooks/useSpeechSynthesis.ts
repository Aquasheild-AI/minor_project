import { useState, useRef, useEffect, useCallback } from 'react';
import {
  stripMarkdownForSpeech,
  detectLanguageForSpeech,
  findBestVoice,
} from '@/utils/speechUtils';

export function useSpeechSynthesis() {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveIntervalRef = useRef<any>(null);

  // Load voices and listen to voiceschanged event
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices && availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      } catch {
        // ignore errors getting voices
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported]);

  // Keep-alive timer for Chrome speech synthesis bug
  // Chrome can pause long utterances after ~15s without an active trigger
  const startKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    keepAliveIntervalRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 10000);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopKeepAlive();
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    currentUtteranceRef.current = null;
    setSpeakingMessageId(null);
    setIsPlaying(false);
    setIsPaused(false);
  }, [isSupported, stopKeepAlive]);

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to pause speech:', err);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to resume speech:', err);
    }
  }, [isSupported]);

  const speak = useCallback(
    (
      messageId: string,
      rawText: string,
      fallbackLang: string = 'en',
      langOverride?: 'hi-IN' | 'en-IN'
    ) => {
      if (!isSupported) {
        setError('ttsNotSupported');
        return;
      }

      // Stop any existing speech playback first (prevent overlapping audio)
      stop();
      setError(null);

      const cleanText = stripMarkdownForSpeech(rawText);
      if (!cleanText.trim()) return;

      const targetLang =
        langOverride || detectLanguageForSpeech(cleanText, fallbackLang);

      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = targetLang;
        utterance.rate = 0.95; // Clear and measured pace for community users
        utterance.pitch = 1.0;

        const bestVoice = findBestVoice(voices, targetLang);
        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        utterance.onstart = () => {
          setSpeakingMessageId(messageId);
          setIsPlaying(true);
          setIsPaused(false);
          startKeepAlive();
        };

        utterance.onend = () => {
          stopKeepAlive();
          setSpeakingMessageId(null);
          setIsPlaying(false);
          setIsPaused(false);
          currentUtteranceRef.current = null;
        };

        utterance.onerror = (event) => {
          stopKeepAlive();
          console.warn('Speech synthesis utterance error:', event.error);
          // If canceled intentionally, do not show error
          if (event.error !== 'canceled' && event.error !== 'interrupted') {
            setError('ttsVoiceUnavailable');
          }
          setSpeakingMessageId(null);
          setIsPlaying(false);
          setIsPaused(false);
          currentUtteranceRef.current = null;
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Failed to speak:', err);
        setError('ttsVoiceUnavailable');
        setSpeakingMessageId(null);
        setIsPlaying(false);
        setIsPaused(false);
      }
    },
    [isSupported, voices, stop, startKeepAlive, stopKeepAlive]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSupported,
    speakingMessageId,
    isPlaying,
    isPaused,
    error,
    clearError,
    speak,
    pause,
    resume,
    stop,
  };
}

