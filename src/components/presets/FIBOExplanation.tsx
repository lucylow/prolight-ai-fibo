import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Code, Target, Repeat, Sparkles } from 'lucide-react';

const FIBOExplanation: React.FC = () => {
  const features = [
    {
      icon: Code,
      title: 'Structured JSON Format',
      description: 'FIBO uses JSON-native prompts instead of free-form text, providing precise control over every lighting parameter.',
    },
    {
      icon: Target,
      title: 'Deterministic Results',
      description: 'Same FIBO JSON + seed = same image. Perfect for reproducible professional workflows and iterative refinement.',
    },
    {
      icon: Zap,
      title: 'Interactive Control',
      description: 'Adjust lighting parameters in real-time and see immediate visual feedback in the 3D preview before generation.',
    },
    {
      icon: Repeat,
      title: 'Reproducible Presets',
      description: 'Save and share lighting setups as FIBO JSON. Load them anytime to recreate the exact same lighting conditions.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-premium p-8 mb-8"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">How FIBO Interactive Works</h2>
          <p className="text-muted-foreground">
            ProLight AI uses FIBO's interactive JSON-native architecture to provide professional-grade, 
            deterministic lighting control. Unlike traditional AI image generators that rely on text prompts, 
            FIBO uses structured JSON for precise, reproducible results.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Code className="w-4 h-4" />
          The FIBO Advantage
        </h3>
        <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
          <li>
            <strong className="text-foreground">Precision:</strong> Control exact lighting parameters like intensity, 
            color temperature, softness, and direction
          </li>
          <li>
            <strong className="text-foreground">Consistency:</strong> Generate identical results by reusing the same 
            FIBO JSON structure with the same seed
          </li>
          <li>
            <strong className="text-foreground">Iteration:</strong> Make small adjustments to specific parameters 
            without regenerating the entire scene
          </li>
          <li>
            <strong className="text-foreground">Professional Workflow:</strong> Export presets as FIBO JSON to share 
            with team members or use across different projects
          </li>
        </ul>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong>Try it:</strong> Click on any preset below to see its FIBO JSON structure. You can copy the JSON 
          and use it directly with FIBO-compatible systems, or load it back into ProLight AI for consistent results.
        </p>
      </div>
    </motion.div>
  );
};

export default FIBOExplanation;

