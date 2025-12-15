import { motion } from 'framer-motion';
import { useLighting } from '@/hooks/useLighting';
import { useLightingStore } from '@/stores/lightingStore';

const LightingRatioGauge = () => {
  const { lightingSetup } = useLighting();
  const { lightingAnalysis } = useLightingStore();
  
  // Use backend analysis if available, otherwise calculate locally
  const ratioValue = lightingAnalysis?.keyFillRatio ?? (() => {
    const keyIntensity = lightingSetup.key?.intensity ?? 0.8;
    const fillIntensity = lightingSetup.fill?.intensity ?? 0.4;
    return fillIntensity > 0 ? keyIntensity / fillIntensity : 10;
  })();
  
  const ratio = ratioValue.toFixed(1);
  
  // Use backend lighting style if available
  const lightingStyle = lightingAnalysis?.lightingStyle;
  
  const getStyle = () => {
    // Use backend analysis style if available
    if (lightingStyle) {
      if (lightingStyle.includes('dramatic') || lightingStyle.includes('high_contrast')) {
        return { label: 'Dramatic', color: 'hsl(0 84% 60%)' };
      }
      if (lightingStyle.includes('classical') || lightingStyle.includes('portrait')) {
        return { label: 'Classical', color: 'hsl(38 92% 50%)' };
      }
      if (lightingStyle.includes('soft') || lightingStyle.includes('flat')) {
        return { label: 'Soft', color: 'hsl(200 84% 60%)' };
      }
    }
    
    // Fallback to ratio-based calculation
    if (ratioValue >= 4) return { label: 'Dramatic', color: 'hsl(0 84% 60%)' };
    if (ratioValue >= 2) return { label: 'Classical', color: 'hsl(38 92% 50%)' };
    return { label: 'Soft', color: 'hsl(200 84% 60%)' };
  };
  
  const style = getStyle();
  const percentage = Math.min((ratioValue / 8) * 100, 100);

  return (
    <div className="glass-card-premium p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Key:Fill Ratio</span>
        <span className="text-lg font-bold" style={{ color: style.color }}>
          {ratio}:1
        </span>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, hsl(200 84% 60%), ${style.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Soft</span>
        <span style={{ color: style.color }} className="font-medium">{style.label}</span>
        <span>Dramatic</span>
      </div>
    </div>
  );
};

export default LightingRatioGauge;
