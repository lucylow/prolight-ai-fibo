/**
 * Speech Service
 * Handles Text-to-Speech (TTS) and Speech-to-Text (STT) functionality
 * Uses browser Web Speech API
 */

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionError {
  error: string;
  message: string;
}

export type SpeechRecognitionEvent = 
  | { type: 'result'; data: SpeechRecognitionResult }
  | { type: 'error'; data: SpeechRecognitionError }
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'nomatch' };

export interface SpeechSynthesisOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null;
  lang?: string;
}

export interface SpeechServiceConfig {
  continuous?: boolean; // For STT: keep listening after result
  interimResults?: boolean; // For STT: return interim results
  lang?: string; // Language code (e.g., 'en-US')
  maxAlternatives?: number; // Number of alternative transcripts
}

/**
 * Check if browser supports speech recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );
}

/**
 * Check if browser supports speech synthesis
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Get available voices for speech synthesis
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) {
    return [];
  }
  return speechSynthesis.getVoices();
}

/**
 * Get default voice for a language
 */
export function getDefaultVoice(lang: string = 'en-US'): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  // Try to find a voice matching the language
  const langVoices = voices.filter((v) => v.lang.startsWith(lang.split('-')[0]));
  if (langVoices.length > 0) {
    // Prefer local voices over remote
    const localVoice = langVoices.find((v) => v.localService);
    return localVoice || langVoices[0];
  }
  // Fallback to first available voice
  return voices[0] || null;
}

/**
 * Speech Recognition Service (STT)
 */
export class SpeechRecognitionService {
  private recognition: any;
  private isListening: boolean = false;
  private listeners: Map<string, (event: SpeechRecognitionEvent) => void> = new Map();

  constructor(config: SpeechServiceConfig = {}) {
    if (!isSpeechRecognitionSupported()) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = config.continuous ?? false;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.lang = config.lang ?? 'en-US';
    this.recognition.maxAlternatives = config.maxAlternatives ?? 1;

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit({ type: 'start' });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit({ type: 'end' });
    };

    this.recognition.onresult = (event: any) => {
      const results: SpeechRecognitionResult[] = [];
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;
        const isFinal = result.isFinal;

        results.push({
          transcript,
          confidence,
          isFinal,
        });

        this.emit({
          type: 'result',
          data: { transcript, confidence, isFinal },
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      const error: SpeechRecognitionError = {
        error: event.error,
        message: this.getErrorMessage(event.error),
      };
      this.emit({ type: 'error', data: error });
    };

    this.recognition.onnomatch = () => {
      this.emit({ type: 'nomatch' });
    };
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'no-speech':
        return 'No speech was detected. Please try again.';
      case 'aborted':
        return 'Speech recognition was aborted.';
      case 'audio-capture':
        return 'No microphone was found. Please check your microphone.';
      case 'network':
        return 'Network error occurred. Please check your connection.';
      case 'not-allowed':
        return 'Microphone permission was denied. Please allow microphone access.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed.';
      default:
        return `Speech recognition error: ${error}`;
    }
  }

  /**
   * Start listening for speech
   */
  start(): void {
    if (this.isListening) {
      console.warn('Speech recognition is already listening');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.emit({
        type: 'error',
        data: {
          error: 'start-failed',
          message: 'Failed to start speech recognition. It may already be running.',
        },
      });
    }
  }

  /**
   * Stop listening for speech
   */
  stop(): void {
    if (!this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  /**
   * Abort speech recognition
   */
  abort(): void {
    try {
      this.recognition.abort();
      this.isListening = false;
    } catch (error) {
      console.error('Failed to abort speech recognition:', error);
    }
  }

  /**
   * Subscribe to speech recognition events
   */
  on(event: string, callback: (event: SpeechRecognitionEvent) => void): () => void {
    const id = `${Date.now()}-${Math.random()}`;
    this.listeners.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  private emit(event: SpeechRecognitionEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in speech recognition listener:', error);
      }
    });
  }

  /**
   * Check if currently listening
   */
  getListening(): boolean {
    return this.isListening;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechServiceConfig>): void {
    if (config.continuous !== undefined) {
      this.recognition.continuous = config.continuous;
    }
    if (config.interimResults !== undefined) {
      this.recognition.interimResults = config.interimResults;
    }
    if (config.lang !== undefined) {
      this.recognition.lang = config.lang;
    }
    if (config.maxAlternatives !== undefined) {
      this.recognition.maxAlternatives = config.maxAlternatives;
    }
  }
}

/**
 * Speech Synthesis Service (TTS)
 */
export class SpeechSynthesisService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private listeners: Map<string, (event: string) => void> = new Map();

  constructor() {
    if (!isSpeechSynthesisSupported()) {
      throw new Error('Speech synthesis is not supported in this browser');
    }

    // Load voices when they become available
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        // Voices loaded
      });
    }
  }

  /**
   * Speak text
   */
  speak(
    text: string,
    options: SpeechSynthesisOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.cancel();

      this.utterance = new SpeechSynthesisUtterance(text);
      
      // Set options
      this.utterance.rate = options.rate ?? 1;
      this.utterance.pitch = options.pitch ?? 1;
      this.utterance.volume = options.volume ?? 1;
      this.utterance.lang = options.lang ?? 'en-US';
      
      if (options.voice) {
        this.utterance.voice = options.voice;
      } else {
        const defaultVoice = getDefaultVoice(options.lang);
        if (defaultVoice) {
          this.utterance.voice = defaultVoice;
        }
      }

      // Set up event handlers
      this.utterance.onstart = () => {
        this.isSpeaking = true;
        this.emit('start');
      };

      this.utterance.onend = () => {
        this.isSpeaking = false;
        this.emit('end');
        resolve();
      };

      this.utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.emit('error');
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.utterance.onpause = () => {
        this.emit('pause');
      };

      this.utterance.onresume = () => {
        this.emit('resume');
      };

      // Start speaking
      speechSynthesis.speak(this.utterance);
    });
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (this.isSpeaking) {
      speechSynthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  /**
   * Cancel speech
   */
  cancel(): void {
    speechSynthesis.cancel();
    this.isSpeaking = false;
    this.utterance = null;
  }

  /**
   * Subscribe to speech synthesis events
   */
  on(event: string, callback: () => void): () => void {
    const id = `${Date.now()}-${Math.random()}`;
    this.listeners.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  private emit(event: string): void {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in speech synthesis listener:', error);
      }
    });
  }

  /**
   * Check if currently speaking
   */
  getSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if paused
   */
  getPaused(): boolean {
    return speechSynthesis.paused;
  }
}

/**
 * Create a speech recognition service instance
 */
export function createSpeechRecognition(
  config: SpeechServiceConfig = {}
): SpeechRecognitionService {
  return new SpeechRecognitionService(config);
}

/**
 * Create a speech synthesis service instance
 */
export function createSpeechSynthesis(): SpeechSynthesisService {
  return new SpeechSynthesisService();
}
