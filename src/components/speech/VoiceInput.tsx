/**
 * VoiceInput Component
 * Speech-to-text input component with microphone button
 */

import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeech';
import { cn } from '@/lib/utils';

export interface VoiceInputProps {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  lang?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  autoStart?: boolean;
  placeholder?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onError,
  continuous = false,
  lang = 'en-US',
  className,
  buttonClassName,
  disabled = false,
  autoStart = false,
  placeholder = 'Click to start voice input',
}) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    start,
    stop,
    reset,
  } = useSpeechRecognition({
    continuous,
    interimResults: true,
    lang,
    autoStart,
    onResult: (fullTranscript, isFinal) => {
      onTranscript?.(fullTranscript, isFinal);
    },
    onError: (errorMessage) => {
      onError?.(errorMessage);
    },
  });

  const handleToggle = () => {
    if (isListening) {
      stop();
    } else {
      reset();
      start();
    }
  };

  if (!isSupported) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Voice input is not supported in your browser
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isListening ? 'destructive' : 'outline'}
          size="icon"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'shrink-0',
            isListening && 'animate-pulse',
            buttonClassName
          )}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        
        <div className="flex-1 min-w-0">
          {isListening ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Listening...
              {interimTranscript && (
                <span className="text-xs opacity-70">({interimTranscript})</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}
        </div>
      </div>

      {transcript && (
        <div className="text-sm p-2 bg-muted rounded-md">
          <div className="font-medium mb-1">Transcript:</div>
          <div>{transcript}</div>
          {interimTranscript && (
            <div className="text-muted-foreground italic mt-1">
              {interimTranscript}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;

