/**
 * VoiceOutput Component
 * Text-to-speech output component with play/pause controls
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechSynthesis } from '@/hooks/useSpeech';
import { cn } from '@/lib/utils';

export interface VoiceOutputProps {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  autoPlay?: boolean;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  showControls?: boolean;
}

export const VoiceOutput: React.FC<VoiceOutputProps> = ({
  text,
  onStart,
  onEnd,
  onError,
  rate = 1,
  pitch = 1,
  volume = 1,
  lang = 'en-US',
  autoPlay = false,
  className,
  buttonClassName,
  disabled = false,
  showControls = true,
}) => {
  const {
    isSpeaking,
    isPaused,
    error,
    isSupported,
    speak,
    pause,
    resume,
    cancel,
  } = useSpeechSynthesis({
    rate,
    pitch,
    volume,
    lang,
  });

  const [hasSpoken, setHasSpoken] = useState(false);

  // Auto-play when text changes (if enabled)
  useEffect(() => {
    if (autoPlay && text && !hasSpoken && !isSpeaking && !isPaused) {
      handleSpeak();
      setHasSpoken(true);
    }
  }, [autoPlay, text, hasSpoken, isSpeaking, isPaused]);

  // Reset hasSpoken when text changes
  useEffect(() => {
    setHasSpoken(false);
  }, [text]);

  // Handle events
  useEffect(() => {
    if (isSpeaking && !isPaused) {
      onStart?.();
    }
  }, [isSpeaking, isPaused, onStart]);

  useEffect(() => {
    if (!isSpeaking && !isPaused && hasSpoken) {
      onEnd?.();
    }
  }, [isSpeaking, isPaused, hasSpoken, onEnd]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleSpeak = async () => {
    if (!text.trim()) {
      return;
    }

    try {
      await speak(text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to speak text';
      onError?.(errorMessage);
    }
  };

  const handleToggle = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      handleSpeak();
    }
  };

  const handleStop = () => {
    cancel();
    setHasSpoken(false);
  };

  if (!isSupported) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Voice output is not supported in your browser
      </div>
    );
  }

  if (!showControls) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleToggle}
        disabled={disabled || !text.trim()}
        className={cn(
          'shrink-0',
          isSpeaking && !isPaused && 'animate-pulse',
          buttonClassName
        )}
        title={
          isSpeaking
            ? isPaused
              ? 'Resume playback'
              : 'Pause playback'
            : 'Play audio'
        }
      >
        {isSpeaking ? (
          isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {isSpeaking && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleStop}
          disabled={disabled}
          className="shrink-0"
          title="Stop playback"
        >
          <VolumeX className="h-4 w-4" />
        </Button>
      )}

      {error && (
        <div className="text-xs text-destructive flex-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceOutput;

