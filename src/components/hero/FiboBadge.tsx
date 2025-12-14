import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const FiboBadge = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="fixed top-24 right-6 z-50"
    >
      <div className="fibo-badge flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="gradient-text font-bold">Powered by FIBO</span>
        <span className="text-muted-foreground">| Bria AI</span>
      </div>
    </motion.div>
  );
};

export default FiboBadge;
