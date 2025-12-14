import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, Circle } from 'lucide-react';

interface GenerationProgressProps {
  isLoading: boolean;
  currentStep: number;
}

const steps = [
  { label: 'VLM Processing', description: 'Analyzing scene context' },
  { label: 'Lighting Override', description: 'Applying FIBO parameters' },
  { label: 'Rendering', description: 'Generating final image' },
];

const GenerationProgress = ({ isLoading, currentStep }: GenerationProgressProps) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card-premium p-4 space-y-3 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Generation Progress</span>
            <span className="text-xs text-muted-foreground">~$0.04 per image</span>
          </div>
          
          <div className="space-y-2">
            {steps.map((step, i) => {
              const isComplete = i < currentStep;
              const isCurrent = i === currentStep;
              
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isCurrent ? 'bg-primary/10' : ''
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/30" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GenerationProgress;
