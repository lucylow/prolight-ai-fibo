import { motion } from 'framer-motion';
import { useMemo } from 'react';

const AnimatedBackground = () => {
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 10,
      size: 2 + Math.random() * 4,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(265 84% 60% / 0.4) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.2, 0.4],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(239 84% 67% / 0.4) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          x: [-20, 20, -20],
          y: [20, -20, 20],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(200 84% 60% / 0.3) 0%, transparent 70%)' }}
      />
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/40"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            bottom: -20,
          }}
          animate={{
            y: [0, -window.innerHeight - 100],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground;
