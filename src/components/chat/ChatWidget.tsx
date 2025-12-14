/**
 * ChatWidget - React component for AI chat interface
 * Supports both WebSocket and SSE streaming
 */

import React, { useState, useRef, useEffect } from 'react';
import { useChatWS } from '@/hooks/useChatWS';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface ChatWidgetProps {
  conversationId: string;
  useWebSocket?: boolean;
  className?: string;
}

export function ChatWidget({
  conversationId,
  useWebSocket = true,
  className = '',
}: ChatWidgetProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  const handleSend = () => {
    if (!input.trim() || isLoading) {
      return;
    }

    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMessages = [
    ...messages,
    ...(currentResponse ? [{ role: 'assistant' as const, content: currentResponse }] : []),
  ];

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle>AI Chat Assistant</CardTitle>
          <div className="flex items-center gap-2">
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
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] resize-none"
              disabled={isLoading || (useWebSocket && !isConnected)}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || (useWebSocket && !isConnected)}
              size="icon"
              className="h-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
