/**
 * ProLight Pro Controls Component
 * Professional camera and 3-point lighting controls
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProlightProStore } from '@/stores/useProlightProStore';
import { Camera, Lightbulb, Sun, Moon } from 'lucide-react';
import { kelvinToHex, getColorTemperatureLabel } from '@/utils/kelvinToRGB';
import { cn } from '@/lib/utils';

export default function ProLightProControls() {
  const {
    lighting,
    camera,
    updateKeyLight,
    updateFillLight,
    updateRimLight,
    updateAmbient,
    toggleLight,
    updateCamera,
  } = useProlightProStore();

  const LightControl = ({
    title,
    light: lightConfig,
    onUpdate,
    onToggle,
    enabled,
  }: {
    title: string;
    light: typeof lighting.key;
    onUpdate: (updates: Partial<typeof lighting.key>) => void;
    onToggle: () => void;
    enabled: boolean;
  }) => (
    <div className="space-y-4 p-4 rounded-lg bg-[#1a1f2e] border border-[#2a2f4a]">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-[#e0e0e0]">{title}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'text-xs',
            enabled ? 'text-[#48bb78]' : 'text-[#667]'
          )}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#999]">
              <span>Intensity</span>
              <span>{lightConfig.intensity.toFixed(2)}</span>
            </div>
            <Slider
              value={[lightConfig.intensity]}
              onValueChange={([value]) => onUpdate({ intensity: value })}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#999]">
              <span>Horizontal Angle</span>
              <span>{lightConfig.angle_horizontal}°</span>
            </div>
            <Slider
              value={[lightConfig.angle_horizontal]}
              onValueChange={([value]) => onUpdate({ angle_horizontal: value })}
              min={-180}
              max={180}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#999]">
              <span>Vertical Angle</span>
              <span>{lightConfig.angle_vertical}°</span>
            </div>
            <Slider
              value={[lightConfig.angle_vertical]}
              onValueChange={([value]) => onUpdate({ angle_vertical: value })}
              min={0}
              max={90}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#999]">
              <span>Color Temperature</span>
              <span>{lightConfig.color_temperature}K</span>
            </div>
            <div className="flex items-center gap-2">
              <Slider
                value={[lightConfig.color_temperature]}
                onValueChange={([value]) => onUpdate({ color_temperature: value })}
                min={2000}
                max={10000}
                step={100}
                className="flex-1"
              />
              <div
                className="w-8 h-8 rounded border border-[#2a2f4a]"
                style={{ backgroundColor: kelvinToHex(lightConfig.color_temperature) }}
              />
            </div>
            <p className="text-xs text-[#667]">
              {getColorTemperatureLabel(lightConfig.color_temperature)}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#999]">
              <span>Softness</span>
              <span>{lightConfig.softness.toFixed(2)}</span>
            </div>
            <Slider
              value={[lightConfig.softness]}
              onValueChange={([value]) => onUpdate({ softness: value })}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#999]">
              <span>Distance</span>
              <span>{lightConfig.distance.toFixed(1)}m</span>
            </div>
            <Slider
              value={[lightConfig.distance]}
              onValueChange={([value]) => onUpdate({ distance: value })}
              min={0.5}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>

          {'fill_ratio' in lightConfig && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#999]">
                <span>Fill Ratio</span>
                <span>{lightConfig.fill_ratio.toFixed(2)}</span>
              </div>
              <Slider
                value={[lightConfig.fill_ratio]}
                onValueChange={([value]) => onUpdate({ fill_ratio: value } as any)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Camera Controls */}
      <Card className="bg-[#0f1419] border-[#2a2f4a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#e0e0e0]">
            <Camera className="w-5 h-5 text-[#667eea]" />
            Camera Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">Focal Length (mm)</Label>
              <Input
                type="number"
                value={camera.focal_length}
                onChange={(e) => updateCamera({ focal_length: parseFloat(e.target.value) || 50 })}
                className="bg-[#1a1f2e] border-[#2a2f4a] text-[#e0e0e0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">Aperture (f/)</Label>
              <Input
                type="number"
                step="0.1"
                value={camera.aperture}
                onChange={(e) => updateCamera({ aperture: parseFloat(e.target.value) || 2.8 })}
                className="bg-[#1a1f2e] border-[#2a2f4a] text-[#e0e0e0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">ISO</Label>
              <Input
                type="number"
                value={camera.iso}
                onChange={(e) => updateCamera({ iso: parseInt(e.target.value) || 100 })}
                className="bg-[#1a1f2e] border-[#2a2f4a] text-[#e0e0e0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#999]">White Balance (K)</Label>
              <Input
                type="number"
                value={camera.white_balance}
                onChange={(e) => updateCamera({ white_balance: parseInt(e.target.value) || 5500 })}
                className="bg-[#1a1f2e] border-[#2a2f4a] text-[#e0e0e0]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-[#999]">Metering Mode</Label>
            <select
              value={camera.metering_mode}
              onChange={(e) => updateCamera({ metering_mode: e.target.value })}
              className="w-full h-10 rounded-md border bg-[#1a1f2e] border-[#2a2f4a] px-3 text-sm text-[#e0e0e0]"
            >
              <option value="matrix">Matrix</option>
              <option value="center-weighted">Center-Weighted</option>
              <option value="spot">Spot</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 3-Point Lighting Controls */}
      <Card className="bg-[#0f1419] border-[#2a2f4a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#e0e0e0]">
            <Lightbulb className="w-5 h-5 text-[#667eea]" />
            3-Point Lighting Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LightControl
            title="Key Light"
            light={lighting.key}
            onUpdate={updateKeyLight}
            onToggle={() => toggleLight('key')}
            enabled={lighting.key.enabled}
          />
          <LightControl
            title="Fill Light"
            light={lighting.fill}
            onUpdate={updateFillLight}
            onToggle={() => toggleLight('fill')}
            enabled={lighting.fill.enabled}
          />
          <LightControl
            title="Rim Light"
            light={lighting.rim}
            onUpdate={updateRimLight}
            onToggle={() => toggleLight('rim')}
            enabled={lighting.rim.enabled}
          />

          {/* Ambient Light */}
          <div className="space-y-4 p-4 rounded-lg bg-[#1a1f2e] border border-[#2a2f4a]">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#e0e0e0]">Ambient Light</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleLight('ambient')}
                className={cn(
                  'text-xs',
                  lighting.ambient.enabled ? 'text-[#48bb78]' : 'text-[#667]'
                )}
              >
                {lighting.ambient.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {lighting.ambient.enabled && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#999]">
                    <span>Intensity</span>
                    <span>{lighting.ambient.intensity.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[lighting.ambient.intensity]}
                    onValueChange={([value]) => updateAmbient({ intensity: value })}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#999]">
                    <span>Color Temperature</span>
                    <span>{lighting.ambient.color_temperature}K</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[lighting.ambient.color_temperature]}
                      onValueChange={([value]) => updateAmbient({ color_temperature: value })}
                      min={2000}
                      max={10000}
                      step={100}
                      className="flex-1"
                    />
                    <div
                      className="w-8 h-8 rounded border border-[#2a2f4a]"
                      style={{ backgroundColor: kelvinToHex(lighting.ambient.color_temperature) }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

