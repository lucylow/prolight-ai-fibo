/**
 * ChatWidget - React component for AI chat interface
 * Supports both WebSocket and SSE streaming
 * Includes voice features: speech-to-text and text-to-speech
 */

import React, { useState, useRef, useEffect } from 'react';
import { useChatWS } from '@/hooks/useChatWS';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Wifi, WifiOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface ChatWidgetProps {
  conversationId: string;
  useWebSocket?: boolean;
  className?: string;
}

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

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

export function ChatWidget({
  conversationId,
  useWebSocket = true,
  className = '',
}: ChatWidgetProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice features state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    messages,
    currentResponse,
    isConnected,
    isLoading,
    error,
    sendMessage,
    connect,
    disconnect,
  } = useChatWS({
    conversationId,
    autoConnect: useWebSocket,
    onError: (err) => {
      toast.error('Chat Error', {
        description: err.message,
      });
    },
    onIntent: (intent, entities) => {
      if (intent !== 'chat') {
        toast.info('Intent Detected', {
          description: `Detected intent: ${intent}`,
        });
      }
    },
  });

  // Check browser support for speech APIs
  useEffect(() => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    setSpeechRecognitionSupported(!!SpeechRecognition);
    setSpeechSynthesisSupported('speechSynthesis' in window);
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          toast.error('No speech detected', {
            description: 'Please try speaking again.',
          });
        } else if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied', {
            description: 'Please allow microphone access in your browser settings.',
          });
        } else {
          toast.error('Speech recognition error', {
            description: event.message || 'An error occurred while listening.',
          });
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Text-to-speech: Read AI responses automatically (disabled by default, user can enable via button)
  // Removed auto-read to give user control

  const handleSend = () => {
    if (!input.trim() || isLoading) {
      return;
    }

    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    try {
      // Validate event
      if (!e || !e.key) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        // Call handleSend with error handling
        try {
          handleSend();
        } catch (error) {
          console.error('Error sending message:', error);
          toast.error('Failed to send message', {
            description: 'Please try again.',
          });
        }
      }
    } catch (error) {
      console.error('Error handling keydown event:', error);
    }
  };

  const allMessages = [
    ...messages,
    ...(currentResponse ? [{ role: 'assistant' as const, content: currentResponse }] : []),
  ];

  // Speech-to-text: Toggle microphone
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported', {
        description: 'Your browser does not support speech recognition.',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info('Listening...', {
          description: 'Speak your message now.',
          duration: 2000,
        });
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false);
        toast.error('Failed to start listening', {
          description: 'Please try again.',
        });
      }
    }
  };

  // Text-to-speech: Toggle reading
  const toggleSpeaking = () => {
    if (!speechSynthesisSupported) {
      toast.error('Text-to-speech not supported', {
        description: 'Your browser does not support text-to-speech.',
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const lastAssistantMessage = allMessages
        .filter((msg) => msg.role === 'assistant')
        .pop();
      
      if (lastAssistantMessage && lastAssistantMessage.content) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(lastAssistantMessage.content);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        utterance.lang = 'en-US';
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        toast.info('No message to read', {
          description: 'Wait for an AI response first.',
        });
      }
    }
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle>AI Chat Assistant</CardTitle>
          <div className="flex items-center gap-2">
            {speechSynthesisSupported && (
              <Button
                onClick={toggleSpeaking}
                size="icon"
                variant={isSpeaking ? "default" : "ghost"}
                className="h-8 w-8"
                title={isSpeaking ? "Stop reading" : "Read last response"}
              >
                {isSpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {useWebSocket && (
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="outline" className="gap-1">
                    <Wifi className="h-3 w-3 text-green-500" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <WifiOff className="h-3 w-3 text-red-500" />
                    Disconnected
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {allMessages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">Start a conversation with the AI assistant.</p>
                <p className="text-xs mt-2">
                  Ask about lighting, image editing, or request actions like "remove background" or "analyze lighting".
                </p>
              </div>
            )}

            {allMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {index === allMessages.length - 1 && isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin mt-2" />
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
            Error: {error.message}
          </div>
        )}

        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                speechRecognitionSupported
                  ? "Type your message or click the microphone... (Enter to send, Shift+Enter for new line)"
                  : "Type your message... (Enter to send, Shift+Enter for new line)"
              }
              className="min-h-[60px] resize-none"
              disabled={isLoading || (useWebSocket && !isConnected)}
            />
            <div className="flex flex-col gap-2">
              {speechRecognitionSupported && (
                <Button
                  onClick={toggleListening}
                  disabled={isLoading || (useWebSocket && !isConnected)}
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  className="h-[28px] w-full"
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || (useWebSocket && !isConnected)}
                size="icon"
                className="h-[28px] w-full"
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {speechRecognitionSupported && isListening && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>Listening... Speak now</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
