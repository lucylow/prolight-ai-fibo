import { motion } from 'framer-motion';
import { TrendingDown, Zap, CheckCircle } from 'lucide-react';

const stats = [
  { icon: TrendingDown, value: '12,500x', label: 'Cost Reduction', color: 'text-green-400' },
  { icon: Zap, value: '240x', label: 'Faster', color: 'text-secondary' },
  { icon: CheckCircle, value: '100%', label: 'Reproducible', color: 'text-primary' },
];

const StatsCounter = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="flex flex-wrap gap-4 mt-8"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 + i * 0.1 }}
          className="stat-card flex items-center gap-3"
        >
          <stat.icon className={`w-5 h-5 ${stat.color}`} />
          <div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StatsCounter;
