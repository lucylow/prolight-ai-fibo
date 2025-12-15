import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Car, Upload, Wand2, Image as ImageIcon, Download, Sparkles, Snowflake, Cloud, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

interface VehicleShot {
  shot_url?: string;
  segmentation_masks?: {
    windshield?: string;
    rear_window?: string;
    side_windows?: string;
    body?: string;
    wheels?: string;
    hubcap?: string;
    tires?: string;
  };
  reflections_url?: string;
  tire_refinement_url?: string;
  effect_urls?: Record<string, string>;
  harmonized_url?: string;
  workflow_steps?: string[];
  errors?: string[];
}

const VehicleShotEditor = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VehicleShot | null>(null);
  const [activeTab, setActiveTab] = useState('original');
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [harmonizationPreset, setHarmonizationPreset] = useState('warm-day');
  const [includeReflections, setIncludeReflections] = useState(true);
  const [includeTireRefinement, setIncludeTireRefinement] = useState(true);
  const [placementType, setPlacementType] = useState('automatic');
  const [generationMode, setGenerationMode] = useState('fast');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effects = [
    { value: 'dust', label: 'Dust', icon: Sparkles },
    { value: 'snow', label: 'Snow', icon: Snowflake },
    { value: 'fog', label: 'Fog', icon: Cloud },
    { value: 'light_leaks', label: 'Light Leaks', icon: Sun },
    { value: 'lens_flare', label: 'Lens Flare', icon: Sun },
  ];
  const presets = [
    { value: 'warm-day', label: 'Warm Day', icon: Sun },
    { value: 'cold-day', label: 'Cold Day', icon: Sun },
    { value: 'warm-night', label: 'Warm Night', icon: Moon },
    { value: 'cold-night', label: 'Cold Night', icon: Moon },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = async () => {
    if (!imageUrl || !sceneDescription) {
      toast.error('Please provide both image and scene description');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/vehicle-shot/complete-enhancement', {
        image_url: imageUrl,
        scene_description: sceneDescription,
        include_reflections: includeReflections,
        include_tire_refinement: includeTireRefinement,
        effects: selectedEffects.length > 0 ? selectedEffects : undefined,
        harmonization_preset: harmonizationPreset,
      });

      if (response.data.success) {
        setResult(response.data.data);
        toast.success('Vehicle shot enhancement completed!');
      } else {
        throw new Error('Enhancement failed');
      }
    } catch (error: unknown) {
      console.error('Enhancement failed:', error);
      const errorMsg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 
                      'Enhancement failed. Check console for details.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleEffect = (effect: string) => {
    setSelectedEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
  };

  const renderImage = (url: string | undefined, label: string) => {
    if (!url) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{label}</h4>
        <img src={url} alt={label} loading="lazy" className="w-full rounded-lg border shadow-sm" />
      </div>
    );
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Car className="w-8 h-8" />
            Vehicle Shot Editor
          </h1>
          <p className="text-muted-foreground text-lg">
            Create professional automotive product shots with AI-powered enhancements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Shot Configuration</CardTitle>
              <CardDescription>
                Configure your vehicle shot generation and enhancement options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Vehicle Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    placeholder="Image URL or upload file"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {imageUrl && (
                  <div className="mt-2 rounded-md overflow-hidden border">
                    <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sceneDescription">Scene Description</Label>
                <textarea
                  id="sceneDescription"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="Describe the scene or environment for the vehicle (50-110 words)"
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific: lighting, weather, environment, time of day, mood
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="placementType">Placement Type</Label>
                  <Select value={placementType} onValueChange={setPlacementType}>
                    <SelectTrigger id="placementType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual_placement">Manual Placement</SelectItem>
                      <SelectItem value="custom_coordinates">Custom Coordinates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generationMode">Generation Mode</Label>
                  <Select value={generationMode} onValueChange={setGenerationMode}>
                    <SelectTrigger id="generationMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="high_control">High Control</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Enhancement Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reflections"
                      checked={includeReflections}
                      onCheckedChange={(checked) => setIncludeReflections(checked as boolean)}
                    />
                    <Label htmlFor="reflections" className="cursor-pointer">
                      Generate Reflections
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tireRefinement"
                      checked={includeTireRefinement}
                      onCheckedChange={(checked) => setIncludeTireRefinement(checked as boolean)}
                    />
                    <Label htmlFor="tireRefinement" className="cursor-pointer">
                      Refine Tires
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visual Effects</Label>
                <div className="grid grid-cols-2 gap-2">
                  {effects.map((effect) => {
                    const Icon = effect.icon;
                    return (
                      <div key={effect.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={effect.value}
                          checked={selectedEffects.includes(effect.value)}
                          onCheckedChange={() => toggleEffect(effect.value)}
                        />
                        <Label htmlFor={effect.value} className="cursor-pointer flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {effect.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="harmonization">Harmonization Preset</Label>
                <Select value={harmonizationPreset} onValueChange={setHarmonizationPreset}>
                  <SelectTrigger id="harmonization">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <SelectItem key={preset.value} value={preset.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {preset.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleEnhance}
                disabled={loading || !imageUrl || !sceneDescription}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Enhance Vehicle Shot
                  </>
                )}
              </Button>

              {result?.workflow_steps && (
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="text-sm font-medium mb-2">Processing Complete</h4>
                  <p className="text-xs text-muted-foreground">
                    Steps: {result.workflow_steps.join(' → ')}
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <p className="text-xs text-destructive mt-2">
                      Errors: {result.errors.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Results */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Enhanced vehicle shots and segmentation masks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p>Upload an image and configure settings to generate enhanced vehicle shots</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5">
                      {result.shot_url && (
                        <TabsTrigger value="original">Original</TabsTrigger>
                      )}
                      {result.reflections_url && (
                        <TabsTrigger value="reflections">Reflections</TabsTrigger>
                      )}
                      {result.tire_refinement_url && (
                        <TabsTrigger value="tires">Tires</TabsTrigger>
                      )}
                      {result.effect_urls && Object.keys(result.effect_urls).length > 0 && (
                        <TabsTrigger value="effects">Effects</TabsTrigger>
                      )}
                      {result.harmonized_url && (
                        <TabsTrigger value="final">Final</TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="original" className="mt-4">
                      {renderImage(result.shot_url, 'Generated Vehicle Shot')}
                    </TabsContent>
                    <TabsContent value="reflections" className="mt-4">
                      {renderImage(result.reflections_url, 'With Reflections')}
                    </TabsContent>
                    <TabsContent value="tires" className="mt-4">
                      {renderImage(result.tire_refinement_url, 'With Refined Tires')}
                    </TabsContent>
                    <TabsContent value="effects" className="mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        {result.effect_urls &&
                          Object.entries(result.effect_urls).map(([effect, url]) => (
                            <div key={effect} className="space-y-2">
                              <h4 className="text-sm font-medium capitalize">
                                {effect.replace('_', ' ')}
                              </h4>
                              <img src={url} alt={effect} loading="lazy" className="w-full rounded-lg border" />
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="final" className="mt-4">
                      {renderImage(result.harmonized_url, 'Final Harmonized Result')}
                    </TabsContent>
                  </Tabs>

                  {result.segmentation_masks && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-sm font-medium mb-3">Segmentation Masks</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(result.segmentation_masks).map(([part, url]) =>
                          url ? (
                            <div key={part} className="text-center">
                              <p className="text-xs text-muted-foreground mb-1 capitalize">
                                {part.replace('_', ' ')}
                              </p>
                              <img src={url} alt={part} loading="lazy" className="w-full rounded border" />
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      onClick={() => {
                        const finalUrl =
                          result.harmonized_url ||
                          result.tire_refinement_url ||
                          result.reflections_url ||
                          result.shot_url;
                        if (finalUrl) {
                          downloadImage(finalUrl, 'vehicle-shot.jpg');
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Final Result
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default VehicleShotEditor;

