/**
 * Preset Management Component
 * Save, load, and manage lighting/camera presets
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useProlightProStore } from '@/stores/useProlightProStore';
import { lightingPresets, Preset } from '@/utils/presets';
import { Save, FolderOpen, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PresetManagement() {
  const { savedPresets, loadPreset, savePreset, deletePreset, activePresetId, setActivePreset } = useProlightProStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetCategory, setPresetCategory] = useState<Preset['category']>('studio');

  const allPresets = [...lightingPresets, ...savedPresets];

  const handleSave = () => {
    if (presetName.trim()) {
      savePreset(presetName, presetDescription, presetCategory);
      setPresetName('');
      setPresetDescription('');
      setPresetCategory('studio');
      setShowSaveDialog(false);
    }
  };

  const handleLoad = (preset: Preset) => {
    loadPreset(preset);
    setActivePreset(preset.id);
  };

  const categories: Preset['category'][] = ['studio', 'product', 'portrait', 'dramatic', 'natural'];

  return (
    <Card className="bg-[#0f1419] border-[#2a2f4a]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#e0e0e0]">Preset Management</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            className="bg-[#667eea] hover:bg-[#5568d3]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Save Current
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-4 rounded-lg bg-[#1a1f2e] border border-[#2a2f4a] space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">Preset Name</Label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Soft Product Lighting"
                className="bg-[#0f1419] border-[#2a2f4a] text-[#e0e0e0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">Description</Label>
              <Input
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-[#0f1419] border-[#2a2f4a] text-[#e0e0e0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">Category</Label>
              <select
                value={presetCategory}
                onChange={(e) => setPresetCategory(e.target.value as Preset['category'])}
                className="w-full h-10 rounded-md border bg-[#0f1419] border-[#2a2f4a] px-3 text-sm text-[#e0e0e0]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                size="sm"
                className="flex-1 bg-[#48bb78] hover:bg-[#38a169]"
                disabled={!presetName.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={() => {
                  setShowSaveDialog(false);
                  setPresetName('');
                  setPresetDescription('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Presets List */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryPresets = allPresets.filter((p) => p.category === category);
            if (categoryPresets.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium text-[#999] uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categoryPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        activePresetId === preset.id
                          ? 'bg-[#667eea]/20 border-[#667eea]'
                          : 'bg-[#1a1f2e] border-[#2a2f4a] hover:border-[#667eea]/50'
                      )}
                      onClick={() => handleLoad(preset)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#e0e0e0]">{preset.name}</h4>
                          {preset.description && (
                            <p className="text-xs text-[#667] mt-1">{preset.description}</p>
                          )}
                        </div>
                        {savedPresets.some((p) => p.id === preset.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePreset(preset.id);
                            }}
                            className="text-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

