import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Check, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Camera,
  Sparkles,
  Zap,
  Sun,
  Moon,
  Filter,
  Info
} from 'lucide-react';
import { useLighting } from '@/hooks/useLighting';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type PresetCategory = 'all' | 'portrait' | 'dramatic' | 'commercial' | 'glamour';

const presets = [
  {
    id: 'rembrandt',
    name: 'Rembrandt',
    description: 'Classic portrait lighting with triangle highlight under eye',
    category: 'portrait' as PresetCategory,
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-600',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 0.9, colorTemperature: 5600, softness: 0.4, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.3, colorTemperature: 5600, softness: 0.6, distance: 2.0, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.5, colorTemperature: 5600, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'butterfly',
    name: 'Butterfly (Paramount)',
    description: 'Glamorous lighting from above creating butterfly shadow under nose',
    category: 'glamour' as PresetCategory,
    icon: Sparkles,
    color: 'from-pink-500 to-purple-600',
    lightingSetup: {
      key: { direction: 'above camera', intensity: 0.85, colorTemperature: 5600, softness: 0.5, distance: 1.2, enabled: true },
      fill: { direction: 'frontal', intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.3, colorTemperature: 5600, softness: 0.4, distance: 1.5, enabled: true },
      ambient: { intensity: 0.15, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'loop',
    name: 'Loop Lighting',
    description: 'Subtle shadow loops around the nose, flattering for most faces',
    category: 'portrait' as PresetCategory,
    icon: Sun,
    color: 'from-blue-500 to-cyan-600',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
      fill: { direction: '30 degrees camera-left', intensity: 0.45, colorTemperature: 5600, softness: 0.6, distance: 2.0, enabled: true },
      rim: { direction: 'behind subject left', intensity: 0.4, colorTemperature: 5600, softness: 0.4, distance: 1.2, enabled: true },
      ambient: { intensity: 0.12, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'medium shot', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'split',
    name: 'Split Lighting',
    description: 'Dramatic half-face illumination for moody portraits',
    category: 'dramatic' as PresetCategory,
    icon: Moon,
    color: 'from-gray-600 to-gray-800',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 1.0, colorTemperature: 5600, softness: 0.3, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.1, colorTemperature: 5600, softness: 0.8, distance: 3.0, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.6, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.05, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'highkey',
    name: 'High Key',
    description: 'Bright, even lighting for clean commercial look',
    category: 'commercial' as PresetCategory,
    icon: Zap,
    color: 'from-yellow-400 to-white',
    lightingSetup: {
      key: { direction: 'frontal', intensity: 0.7, colorTemperature: 5600, softness: 0.8, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.65, colorTemperature: 5600, softness: 0.8, distance: 1.8, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.3, colorTemperature: 6500, softness: 0.5, distance: 1.5, enabled: true },
      ambient: { intensity: 0.3, colorTemperature: 5600, enabled: true },
    },
    cameraSettings: { shotType: 'medium shot', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/5.6' },
  },
  {
    id: 'lowkey',
    name: 'Low Key',
    description: 'Dramatic, moody lighting with deep shadows',
    category: 'dramatic' as PresetCategory,
    icon: Moon,
    color: 'from-indigo-600 to-purple-900',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 0.95, colorTemperature: 4500, softness: 0.3, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.15, colorTemperature: 5600, softness: 0.5, distance: 2.5, enabled: true },
      rim: { direction: 'behind subject left', intensity: 0.7, colorTemperature: 3200, softness: 0.2, distance: 1.0, enabled: true },
      ambient: { intensity: 0.02, colorTemperature: 4000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
];

const Presets = () => {
  const { loadPreset } = useLighting();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('all');
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  const categories: { id: PresetCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Presets', count: presets.length },
    { id: 'portrait', label: 'Portrait', count: presets.filter(p => p.category === 'portrait').length },
    { id: 'dramatic', label: 'Dramatic', count: presets.filter(p => p.category === 'dramatic').length },
    { id: 'commercial', label: 'Commercial', count: presets.filter(p => p.category === 'commercial').length },
    { id: 'glamour', label: 'Glamour', count: presets.filter(p => p.category === 'glamour').length },
  ];

  const filteredPresets = useMemo(() => {
    return presets.filter(preset => {
      const matchesSearch = 
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleLoadPreset = (preset: typeof presets[0], e?: React.MouseEvent) => {
    e?.stopPropagation();
    loadPreset({
      lightingSetup: preset.lightingSetup,
      cameraSettings: preset.cameraSettings,
    });
    toast.success(`Loaded ${preset.name} preset`);
  };


  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center justify-center gap-3">
          <Palette className="w-10 h-10" />
          Lighting Presets
        </h1>
        <p className="text-lg text-muted-foreground">
          Professional lighting setups used by photographers worldwide
        </p>
      </motion.div>

      {/* Search and Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 space-y-4"
      >
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Search presets by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'gradient-fibo text-foreground shadow-lg'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30'
              }`}
            >
              {category.label}
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                {category.count}
              </Badge>
            </motion.button>
          ))}
        </div>

        {/* Results Count */}
        {searchQuery || selectedCategory !== 'all' ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground"
          >
            Showing {filteredPresets.length} of {presets.length} presets
          </motion.p>
        ) : null}
      </motion.div>

      {/* Presets Grid */}
      <AnimatePresence mode="wait">
        {filteredPresets.length > 0 ? (
          <motion.div
            key="presets-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPresets.map((preset, i) => {
              const Icon = preset.icon;
              const isExpanded = expandedPreset === preset.id;
              const keyFillRatio = (preset.lightingSetup.key.intensity / preset.lightingSetup.fill.intensity).toFixed(1);

              return (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
                  onClick={() => handleLoadPreset(preset)}
                >
                  {/* Gradient Background Accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${preset.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${preset.color} shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold mb-1">{preset.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{preset.description}</p>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  </div>

                  {/* Category Badge */}
                  <div className="mb-4 relative z-10">
                    <Badge variant="outline" className="capitalize">
                      {preset.category}
                    </Badge>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-2 text-sm mb-4 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Key Intensity</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${preset.lightingSetup.key.intensity * 100}%` }}
                            transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                            className={`h-full bg-gradient-to-r ${preset.color} rounded-full`}
                          />
                        </div>
                        <span className="text-primary font-medium w-12 text-right">
                          {Math.round(preset.lightingSetup.key.intensity * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Fill Intensity</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${preset.lightingSetup.fill.intensity * 100}%` }}
                            transition={{ delay: i * 0.05 + 0.3, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                          />
                        </div>
                        <span className="text-primary font-medium w-12 text-right">
                          {Math.round(preset.lightingSetup.fill.intensity * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Key/Fill Ratio</span>
                      <span className="text-secondary font-semibold">
                        {keyFillRatio}:1
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <Collapsible 
                    open={isExpanded} 
                    onOpenChange={(open) => setExpandedPreset(open ? preset.id : null)}
                  >
                    <CollapsibleTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors relative z-10"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        View Details
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-3 relative z-10">
                      <div className="pt-4 border-t border-border/30 space-y-3">
                        {/* Lighting Setup Details */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Lighting Setup
                          </h4>
                          <div className="space-y-2 text-xs text-muted-foreground pl-6">
                            <div className="flex justify-between">
                              <span>Key Direction:</span>
                              <span className="text-foreground">{preset.lightingSetup.key.direction}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Color Temperature:</span>
                              <span className="text-foreground">{preset.lightingSetup.key.colorTemperature}K</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Softness:</span>
                              <span className="text-foreground">{(preset.lightingSetup.key.softness * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Distance:</span>
                              <span className="text-foreground">{preset.lightingSetup.key.distance}m</span>
                            </div>
                          </div>
                        </div>

                        {/* Camera Settings */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Camera Settings
                          </h4>
                          <div className="space-y-2 text-xs text-muted-foreground pl-6">
                            <div className="flex justify-between">
                              <span>Shot Type:</span>
                              <span className="text-foreground capitalize">{preset.cameraSettings.shotType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Angle:</span>
                              <span className="text-foreground capitalize">{preset.cameraSettings.cameraAngle}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>FOV:</span>
                              <span className="text-foreground">{preset.cameraSettings.fov}°</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Lens:</span>
                              <span className="text-foreground capitalize">{preset.cameraSettings.lensType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Aperture:</span>
                              <span className="text-foreground">{preset.cameraSettings.aperture}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Load Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => handleLoadPreset(preset, e)}
                    className={`w-full mt-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r ${preset.color} text-white shadow-lg hover:shadow-xl transition-all duration-200 relative z-10`}
                  >
                    Load Preset
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="glass-card-premium p-12 max-w-md mx-auto">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No presets found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-lg gradient-fibo text-foreground font-medium"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Presets;
