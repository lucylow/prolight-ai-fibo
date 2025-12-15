/**
 * useSpeech Hook
 * React hook for speech-to-text and text-to-speech functionality
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createSpeechRecognition,
  createSpeechSynthesis,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  type SpeechRecognitionService,
  type SpeechSynthesisService,
  type SpeechRecognitionEvent,
  type SpeechSynthesisOptions,
  getAvailableVoices,
  getDefaultVoice,
} from '@/services/speechService';

export interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  autoStart?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  lang?: string;
  autoPlay?: boolean;
}

/**
 * Hook for speech recognition (STT)
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    continuous = false,
    interimResults = true,
    lang = 'en-US',
    autoStart = false,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setIsSupported(supported);

    if (!supported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    try {
      recognitionRef.current = createSpeechRecognition({
        continuous,
        interimResults,
        lang,
      });

      // Subscribe to events
      unsubscribeRef.current = recognitionRef.current.on((event: SpeechRecognitionEvent) => {
        if (event.type === 'start') {
          setIsListening(true);
          setError(null);
        } else if (event.type === 'end') {
          setIsListening(false);
        } else if (event.type === 'result') {
          const { transcript: newTranscript, isFinal } = event.data;
          
          if (isFinal) {
            setTranscript((prev) => {
              const updated = prev ? `${prev} ${newTranscript}` : newTranscript;
              onResult?.(updated, true);
              return updated;
            });
            setInterimTranscript('');
          } else {
            setInterimTranscript(newTranscript);
            if (onResult) {
              const fullTranscript = transcript ? `${transcript} ${newTranscript}` : newTranscript;
              onResult(fullTranscript, false);
            }
          }
        } else if (event.type === 'error') {
          const errorMessage = event.data.message;
          setError(errorMessage);
          setIsListening(false);
          onError?.(errorMessage);
        }
      });

      // Auto-start if enabled
      if (autoStart) {
        recognitionRef.current.start();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize speech recognition';
      setError(errorMessage);
      setIsSupported(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }
    };
  }, [continuous, interimResults, lang, autoStart, onResult, onError]);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start listening';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    }
  }, [isListening, onError]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    start,
    stop,
    reset,
  };
}

/**
 * Hook for speech synthesis (TTS)
 */
export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const {
    rate = 1,
    pitch = 1,
    volume = 1,
    voice = null,
    lang = 'en-US',
    autoPlay = false,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const synthesisRef = useRef<SpeechSynthesisService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    const supported = isSpeechSynthesisSupported();
    setIsSupported(supported);

    if (!supported) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }

    try {
      synthesisRef.current = createSpeechSynthesis();

      // Load voices
      const loadVoices = () => {
        const availableVoices = getAvailableVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      
      // Listen for voices changed
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.addEventListener('voiceschanged', loadVoices);
      }

      // Subscribe to events
      unsubscribeRef.current = synthesisRef.current.on((event: string) => {
        if (event === 'start') {
          setIsSpeaking(true);
          setIsPaused(false);
          setError(null);
        } else if (event === 'end') {
          setIsSpeaking(false);
          setIsPaused(false);
        } else if (event === 'pause') {
          setIsPaused(true);
        } else if (event === 'resume') {
          setIsPaused(false);
        } else if (event === 'error') {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize speech synthesis';
      setError(errorMessage);
      setIsSupported(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  const speak = useCallback(
    async (text: string, customOptions?: Partial<SpeechSynthesisOptions>) => {
      if (!synthesisRef.current || !text.trim()) {
        return;
      }

      try {
        const finalVoice = customOptions?.voice ?? voice ?? getDefaultVoice(lang);
        
        await synthesisRef.current.speak(text, {
          rate: customOptions?.rate ?? rate,
          pitch: customOptions?.pitch ?? pitch,
          volume: customOptions?.volume ?? volume,
          voice: finalVoice,
          lang: customOptions?.lang ?? lang,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to speak text';
        setError(errorMessage);
        throw err;
      }
    },
    [rate, pitch, volume, voice, lang]
  );

  const pause = useCallback(() => {
    if (synthesisRef.current && isSpeaking) {
      synthesisRef.current.pause();
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (synthesisRef.current && isPaused) {
      synthesisRef.current.resume();
    }
  }, [isPaused]);

  const cancel = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  }, []);

  return {
    isSpeaking,
    isPaused,
    error,
    isSupported,
    voices,
    speak,
    pause,
    resume,
    cancel,
  };
}

/**
 * Combined hook for both STT and TTS
 */
export function useSpeech(
  recognitionOptions?: UseSpeechRecognitionOptions,
  synthesisOptions?: UseSpeechSynthesisOptions
) {
  const recognition = useSpeechRecognition(recognitionOptions);
  const synthesis = useSpeechSynthesis(synthesisOptions);

  return {
    recognition,
    synthesis,
  };
}

