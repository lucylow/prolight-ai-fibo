import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "What is ProLight AI?",
  "How does the lighting simulator work?",
  "What is FIBO technology?",
  "Show me pricing information",
];

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your ProLight AI assistant. I can help you learn about our lighting simulator, FIBO technology, pricing, and more. What would you like to know?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Reset unread count when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Generate smart response based on user input
  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Pricing questions
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
      return "ProLight AI offers competitive pricing starting at $0.04 per image generation. Our FIBO-powered system is significantly faster and more cost-effective than traditional AI image generators. Would you like to see our pricing plans?";
    }
    
    // FIBO questions
    if (lowerMessage.includes('fibo') || lowerMessage.includes('json') || lowerMessage.includes('deterministic')) {
      return "FIBO (BRIA's JSON-native AI) is revolutionary technology that uses structured JSON prompts instead of text descriptions. This means:\n\n• 100% reproducible results with the same parameters\n• Precise control over lighting parameters\n• Faster generation (< 3 seconds)\n• Lower costs ($0.04 vs $0.50+)\n\nOur simulator leverages FIBO to give you professional-grade lighting control!";
    }
    
    // How it works / features
    if (lowerMessage.includes('how') && (lowerMessage.includes('work') || lowerMessage.includes('use'))) {
      return "ProLight AI's lighting simulator works in three simple steps:\n\n1️⃣ **Adjust Parameters**: Control key light, fill light, color temperature, and more\n2️⃣ **Real-time Preview**: See your lighting setup in 3D before generation\n3️⃣ **Generate**: Create professional images with AI-powered precision\n\nYou can also use natural language commands like 'softer fill light' or 'warmer key light'!";
    }
    
    // Features / capabilities
    if (lowerMessage.includes('feature') || lowerMessage.includes('capability') || lowerMessage.includes('can')) {
      return "ProLight AI offers:\n\n✨ **Precise Parameter Control** - Adjust intensity, color temperature, softness\n🎨 **3D Visualization** - See lighting before generation\n⚡ **FIBO Integration** - JSON-native, deterministic results\n📊 **Lighting Analysis** - Real-time feedback on ratios and ratings\n🗣️ **Natural Language** - Control with simple commands\n\nReady to try it? Click 'Launch Simulator' to get started!";
    }
    
    // Demo / try / test
    if (lowerMessage.includes('demo') || lowerMessage.includes('try') || lowerMessage.includes('test') || lowerMessage.includes('start')) {
      return "Great! You can try ProLight AI right now:\n\n1. Click the 'Launch Simulator' button on the page\n2. Adjust the lighting parameters in real-time\n3. See your changes instantly in the 3D preview\n4. Generate professional images with one click\n\nYou can also scroll down to see the interactive demo section!";
    }
    
    // Comparison / vs / difference
    if (lowerMessage.includes('vs') || lowerMessage.includes('compare') || lowerMessage.includes('difference') || lowerMessage.includes('better')) {
      return "ProLight AI vs Traditional AI:\n\n**ProLight AI (FIBO)**\n✅ Precise JSON parameters\n✅ 100% deterministic\n✅ $0.04 per image\n✅ < 3 seconds generation\n\n**Traditional AI**\n❌ Text descriptions only\n❌ Random each time\n❌ $0.50+ per image\n❌ 10-30 seconds\n\nFIBO gives you professional control at a fraction of the cost!";
    }
    
    // Default helpful response
    return "I'm here to help you learn about ProLight AI! You can ask me about:\n\n• How the lighting simulator works\n• FIBO technology and its benefits\n• Pricing and plans\n• Features and capabilities\n• Getting started\n\nOr try one of the suggested prompts below!";
  };

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay, then show response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(messageText),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
      
      // Increment unread count if dialog is closed when response arrives
      if (!isOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    }, 800 + Math.random() * 700); // 800-1500ms delay for realism
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    try {
      if (!e || !e.key) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        try {
          handleSendMessage();
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    } catch (error) {
      console.error('Error handling keydown event:', error);
    }
  };

  const showSuggestedPrompts = messages.length === 1 && !isTyping;

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/50 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110 relative"
        >
          <Bot className="h-6 w-6" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-xs font-bold text-destructive-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
          <span className="sr-only">Open chatbot</span>
        </Button>
      </motion.div>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  ProLight AI Assistant
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-green-500"
                  />
                </h3>
                <p className="text-xs text-muted-foreground font-normal">Online • Ready to help</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm border border-border/50'
                    }`}
                  >
                    {message.sender === 'bot' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">Assistant</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    <span className="text-xs opacity-60 mt-2 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-muted border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Assistant</span>
                    </div>
                    <div className="flex gap-1.5">
                      <motion.div
                        className="h-2 w-2 rounded-full bg-muted-foreground/40"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="h-2 w-2 rounded-full bg-muted-foreground/40"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="h-2 w-2 rounded-full bg-muted-foreground/40"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </AnimatePresence>
          </div>

          {/* Suggested Prompts */}
          {showSuggestedPrompts && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 pb-3 border-t border-border/30 bg-muted/30"
            >
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-background border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Input Area */}
          <div className="px-6 pb-6 pt-4 border-t bg-background/50 backdrop-blur-sm">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about ProLight AI, FIBO, pricing, features..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button
                onClick={() => handleSendMessage()}
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={!inputValue.trim() || isTyping}
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Chatbot;

