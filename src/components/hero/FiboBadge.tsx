import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const FiboBadge = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="fixed top-20 sm:top-24 right-3 sm:right-4 md:right-6 z-50"
    >
      <div className="fibo-badge flex items-center gap-1.5 sm:gap-2">
        <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
        <span className="text-white font-bold text-[10px] sm:text-xs">Powered by FIBO</span>
        <span className="text-muted-foreground text-[10px] sm:text-xs hidden sm:inline">| Bria AI</span>
      </div>
    </motion.div>
  );
};

export default FiboBadge;
