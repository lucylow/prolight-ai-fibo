import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import type { DiffViewerProps } from '@/types/hitl';
import { ImageIcon, Eye, EyeOff, TrendingUp } from 'lucide-react';

export default function DiffViewer({
  before,
  after,
  previewUrl,
  overlays = [],
  drift,
}: DiffViewerProps) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [showMask, setShowMask] = useState(overlays.includes('mask'));
  const [showHeatmap, setShowHeatmap] = useState(overlays.includes('heatmap'));

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Before / After Comparison</CardTitle>
          <div className="flex items-center gap-2">
            {overlays.includes('mask') && (
              <button
                onClick={() => setShowMask(!showMask)}
                className={`px-2 py-1 text-xs rounded ${
                  showMask ? 'bg-teal-500 text-black' : 'bg-neutral-800 text-slate-400'
                }`}
              >
                {showMask ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Mask
              </button>
            )}
            {overlays.includes('heatmap') && (
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-2 py-1 text-xs rounded ${
                  showHeatmap ? 'bg-teal-500 text-black' : 'bg-neutral-800 text-slate-400'
                }`}
              >
                {showHeatmap ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Heatmap
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Comparison */}
        <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {before || after || previewUrl ? (
            <div className="relative w-full h-full">
              {/* Before Image */}
              {before && (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${before})`,
                    clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)`,
                  }}
                />
              )}
              {/* After/Preview Image */}
              {(after || previewUrl) && (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${after || previewUrl})`,
                    clipPath: `inset(0 0 0 ${sliderValue[0]}%)`,
                  }}
                />
              )}
              {/* Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-teal-500 z-10"
                style={{ left: `${sliderValue[0]}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No preview available</div>
              </div>
            </div>
          )}
        </div>

        {/* Slider Control */}
        <div className="px-2">
          <Slider
            value={sliderValue}
            onValueChange={setSliderValue}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Before</span>
            <span>After</span>
          </div>
        </div>

        {/* Drift Indicator */}
        {drift !== undefined && (
          <div className="flex items-center gap-2 p-3 bg-black/50 rounded-xl">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <div className="flex-1">
              <div className="text-xs text-slate-400 mb-1">Composition Drift</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                    style={{ width: `${Math.min(drift * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-white">
                  {(drift * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {drift < 0.3 ? 'Low drift' : drift < 0.6 ? 'Moderate drift' : 'High drift'}
              </div>
            </div>
          </div>
        )}

        {/* Overlay Info */}
        {(showMask || showHeatmap) && (
          <div className="text-xs text-slate-500 p-2 bg-black/30 rounded">
            {showMask && <div>• Mask overlay: Shows alpha channel / transparency</div>}
            {showHeatmap && <div>• Heatmap overlay: Shows lighting intensity changes</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

