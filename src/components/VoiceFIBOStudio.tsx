/**
 * VoiceFIBOStudio - Voice-Controlled Photography Studio
 * Converts voice commands to FIBO JSON and updates lighting in real-time
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLightingStore } from '@/stores/lightingStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/utils/env';

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechRecognition?: new () => SpeechRecognition;
}

const GEMINI_SYSTEM_PROMPT = `You are ProLight AI Voice Assistant. Convert natural language photography descriptions to FIBO JSON.

You understand professional photography terminology:
- Lighting: "soft key light", "dramatic rim", "three point", "beauty lighting", "high key", "low key"
- Camera: "85mm f/2.8", "50mm portrait", "wide angle f/8", "telephoto"
- Background: "white seamless", "black backdrop", "gray seamless", "studio background"
- Color: "warm tungsten", "cool daylight", "3200K", "5600K", "daylight balanced"

ALWAYS return VALID JSON only. Parse lighting ratios, camera specs, backgrounds, and color temperatures.
Return a complete FIBO structure with lighting, camera, and environment sections.
Use snake_case for all keys.`;

interface VoiceFIBOStudioProps {
  className?: string;
  onFIBOGenerated?: (fibo: Record<string, unknown>) => void;
}

export const VoiceFIBOStudio: React.FC<VoiceFIBOStudioProps> = ({
  className,
  onFIBOGenerated,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [fiboJson, setFiboJson] = useState<Record<string, unknown> | null>(null);
  const [ttsMessage, setTtsMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const {
    updateLight,
    updateCamera,
    updateScene,
    lightingSetup,
    cameraSettings,
  } = useLightingStore();

  // Check for Speech Recognition support
  useEffect(() => {
    const windowWithSpeech = window as unknown as WindowWithSpeech;
    const SpeechRecognition =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setTranscript(finalTranscriptRef.current + interimTranscript);
          // Auto-convert when we have a complete sentence
          if (finalTranscript.trim().length > 10) {
            convertToFIBO(finalTranscriptRef.current.trim());
            finalTranscriptRef.current = '';
          }
        } else {
          setTranscript(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if we're still supposed to be listening
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            console.error('Error restarting recognition:', e);
            setIsListening(false);
          }
        }
      };
    } else {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    // Initialize TTS
    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isListening]);

  // Convert natural language to FIBO JSON using Gemini API
  const convertToFIBO = useCallback(async (naturalLanguage: string) => {
    if (!naturalLanguage.trim() || naturalLanguage.length < 5) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/gemini/fibo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: naturalLanguage,
          system: GEMINI_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const fibo = data.fibo;

      setFiboJson(fibo);
      
      // Update lighting store with FIBO data
      if (fibo.lighting) {
        updateLightingFromFIBO(fibo.lighting);
      }
      
      if (fibo.camera) {
        updateCameraFromFIBO(fibo.camera);
      }
      
      if (fibo.environment) {
        updateSceneFromFIBO(fibo.environment);
      }

      // Generate TTS confirmation
      const confirmation = generateConfirmationMessage(fibo);
      speak(confirmation);
      
      if (onFIBOGenerated) {
        onFIBOGenerated(fibo);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert to FIBO';
      setError(errorMessage);
      speak(`Error: ${errorMessage}`);
      console.error('FIBO conversion error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onFIBOGenerated]);

  // Update lighting store from FIBO lighting structure
  const updateLightingFromFIBO = (lighting: Record<string, unknown>) => {
    // Main/Key light
    if (lighting.main_light || lighting.key_light) {
      const mainLight = (lighting.main_light || lighting.key_light) as Record<string, unknown>;
      updateLight('key', {
        intensity: typeof mainLight.intensity === 'number' ? mainLight.intensity : 0.8,
        colorTemperature: typeof mainLight.color_temperature === 'number' 
          ? mainLight.color_temperature 
          : typeof mainLight.colorTemperature === 'number'
          ? mainLight.colorTemperature
          : 5600,
        softness: typeof mainLight.softness === 'number' ? mainLight.softness : 0.5,
        distance: typeof mainLight.distance === 'number' ? mainLight.distance : 1.5,
        direction: typeof mainLight.direction === 'string' 
          ? mainLight.direction 
          : '45 degrees camera-right',
        enabled: mainLight.enabled !== false,
      });
    }

    // Fill light
    if (lighting.fill_light || lighting.fillLight) {
      const fillLight = (lighting.fill_light || lighting.fillLight) as Record<string, unknown>;
      updateLight('fill', {
        intensity: typeof fillLight.intensity === 'number' ? fillLight.intensity : 0.4,
        colorTemperature: typeof fillLight.color_temperature === 'number'
          ? fillLight.color_temperature
          : typeof fillLight.colorTemperature === 'number'
          ? fillLight.colorTemperature
          : 5600,
        softness: typeof fillLight.softness === 'number' ? fillLight.softness : 0.7,
        distance: typeof fillLight.distance === 'number' ? fillLight.distance : 2.0,
        direction: typeof fillLight.direction === 'string'
          ? fillLight.direction
          : '30 degrees camera-left',
        enabled: fillLight.enabled !== false,
      });
    }

    // Rim light
    if (lighting.rim_light || lighting.rimLight) {
      const rimLight = (lighting.rim_light || lighting.rimLight) as Record<string, unknown>;
      updateLight('rim', {
        intensity: typeof rimLight.intensity === 'number' ? rimLight.intensity : 0.6,
        colorTemperature: typeof rimLight.color_temperature === 'number'
          ? rimLight.color_temperature
          : typeof rimLight.colorTemperature === 'number'
          ? rimLight.colorTemperature
          : 3200,
        softness: typeof rimLight.softness === 'number' ? rimLight.softness : 0.3,
        distance: typeof rimLight.distance === 'number' ? rimLight.distance : 1.0,
        direction: typeof rimLight.direction === 'string'
          ? rimLight.direction
          : 'behind subject left',
        enabled: rimLight.enabled !== false,
      });
    }

    // Ambient light
    if (lighting.ambient || lighting.ambient_light || lighting.ambientLight) {
      const ambient = (lighting.ambient || lighting.ambient_light || lighting.ambientLight) as Record<string, unknown>;
      updateLight('ambient', {
        intensity: typeof ambient.intensity === 'number' ? ambient.intensity : 0.1,
        colorTemperature: typeof ambient.color_temperature === 'number'
          ? ambient.color_temperature
          : typeof ambient.colorTemperature === 'number'
          ? ambient.colorTemperature
          : 5000,
        enabled: ambient.enabled !== false,
      });
    }
  };

  // Update camera from FIBO camera structure
  const updateCameraFromFIBO = (camera: Record<string, unknown>) => {
    const updates: Partial<typeof cameraSettings> = {};

    if (camera.fov && typeof camera.fov === 'number') {
      updates.fov = camera.fov;
    }

    if (camera.aperture) {
      updates.aperture = String(camera.aperture);
    }

    if (camera.shot_type || camera.shotType) {
      updates.shotType = String(camera.shot_type || camera.shotType);
    }

    if (camera.camera_angle || camera.cameraAngle) {
      updates.cameraAngle = String(camera.camera_angle || camera.cameraAngle);
    }

    if (camera.lens_type || camera.lensType) {
      updates.lensType = String(camera.lens_type || camera.lensType);
    }

    if (Object.keys(updates).length > 0) {
      updateCamera(updates);
    }
  };

  // Update scene from FIBO environment structure
  const updateSceneFromFIBO = (environment: Record<string, unknown>) => {
    const updates: Partial<{ environment: string; subjectDescription: string; stylePreset: string; enhanceHDR: boolean }> = {};

    if (environment.setting) {
      updates.environment = String(environment.setting);
    }

    if (environment.lighting_conditions || environment.lightingConditions) {
      updates.environment = String(environment.lighting_conditions || environment.lightingConditions);
    }

    if (Object.keys(updates).length > 0) {
      updateScene(updates);
    }
  };

  // Generate confirmation message from FIBO
  const generateConfirmationMessage = (fibo: Record<string, unknown>): string => {
    const parts: string[] = [];
    
    if (fibo.lighting) {
      const lighting = fibo.lighting as Record<string, unknown>;
      if (lighting.main_light || lighting.key_light) {
        const main = (lighting.main_light || lighting.key_light) as Record<string, unknown>;
        const intensity = typeof main.intensity === 'number' ? main.intensity.toFixed(1) : '0.8';
        parts.push(`${intensity}x key light`);
      }
      if (lighting.fill_light || lighting.fillLight) {
        const fill = (lighting.fill_light || lighting.fillLight) as Record<string, unknown>;
        const intensity = typeof fill.intensity === 'number' ? fill.intensity.toFixed(1) : '0.4';
        parts.push(`${intensity}x fill`);
      }
    }
    
    if (fibo.camera) {
      const camera = fibo.camera as Record<string, unknown>;
      if (camera.lens_type || camera.lensType) {
        const lens = String(camera.lens_type || camera.lensType);
        const aperture = camera.aperture ? String(camera.aperture) : '';
        parts.push(`${lens}${aperture ? ` ${aperture}` : ''}`);
      }
    }
    
    return parts.length > 0 
      ? `Setup complete: ${parts.join(', ')}`
      : 'Setup complete!';
  };

  // Text-to-Speech
  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel(); // Cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a natural voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes('Samantha') || v.name.includes('Karen') || v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onend = () => {
      setTtsMessage('');
    };
    
    setTtsMessage(text);
    synthRef.current.speak(utterance);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    if (isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      speak('Voice control stopped');
    } else {
      setIsListening(true);
      setTranscript('');
      finalTranscriptRef.current = '';
      setError(null);
      try {
        recognitionRef.current.start();
        speak('Listening...');
      } catch (e) {
        console.error('Error starting recognition:', e);
        setIsListening(false);
        setError('Failed to start voice recognition');
      }
    }
  }, [isListening, isSupported, speak]);

  return (
    <Card className={cn('p-6 space-y-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Control
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Speak your lighting setup in natural language
          </p>
        </div>
        {!isSupported && (
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        )}
      </div>

      {/* Voice Control Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={toggleListening}
          disabled={!isSupported || isProcessing}
          size="lg"
          className={cn(
            'flex items-center gap-2 min-w-[200px]',
            isListening && 'bg-red-500 hover:bg-red-600',
            !isSupported && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Voice Control
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 text-sm">
          {isListening ? (
            <span className="flex items-center gap-2 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Listening...
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="text-xs text-muted-foreground mb-1">Transcript:</div>
          <div className="text-sm">{transcript}</div>
        </div>
      )}

      {/* TTS Message */}
      {ttsMessage && (
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm">{ttsMessage}</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* FIBO JSON Preview */}
      {fiboJson && (
        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            FIBO JSON Generated:
          </div>
          <pre className="text-xs overflow-x-auto max-h-48 bg-background p-2 rounded border">
            {JSON.stringify(fiboJson, null, 2)}
          </pre>
        </div>
      )}

      {/* Help Text */}
      {!isListening && !transcript && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Try saying:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>"soft key light from left, 85mm f/2.8"</li>
            <li>"dramatic rim lighting warm, white seamless background"</li>
            <li>"studio three point lighting, product shot"</li>
          </ul>
        </div>
      )}
    </Card>
  );
};

export default VoiceFIBOStudio;

