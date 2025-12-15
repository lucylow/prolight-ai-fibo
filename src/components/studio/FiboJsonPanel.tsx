import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useLighting } from '@/hooks/useLighting';

const FiboJsonPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { lightingSetup } = useLighting();

  const fiboJson = {
    lighting: {
      main_light: {
        direction: lightingSetup.key?.direction || 'front-right',
        intensity: lightingSetup.key?.intensity || 0.8,
        color_temperature: lightingSetup.key?.colorTemperature || 5600,
        softness: lightingSetup.key?.softness || 0.5,
      },
      fill_light: {
        direction: lightingSetup.fill?.direction || 'front-left',
        intensity: lightingSetup.fill?.intensity || 0.4,
        softness: lightingSetup.fill?.softness || 0.7,
      },
      rim_light: {
        direction: lightingSetup.rim?.direction || 'back',
        intensity: lightingSetup.rim?.intensity || 0.6,
        color_temperature: lightingSetup.rim?.colorTemperature || 3200,
      },
    },
    seed: Math.floor(Math.random() * 999999),
    deterministic: true,
  };

  const jsonString = JSON.stringify(fiboJson, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card-premium overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">View Structured Prompt</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/30"
          >
            <div className="p-4 relative">
              <button
                onClick={handleCopy}
                className="absolute top-6 right-6 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <pre className="text-xs font-mono overflow-x-auto">
                <code className="text-primary/80">{jsonString}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FiboJsonPanel;
