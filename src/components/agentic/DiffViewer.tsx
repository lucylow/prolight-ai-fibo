/**
 * Diff Viewer Component
 * Shows before/after comparison with overlays (mask, heatmap, etc.)
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";

interface DiffViewerProps {
  before?: string;
  after?: string;
  overlays?: ("mask" | "heatmap")[];
  drift?: number;
  className?: string;
}

export function DiffViewer({
  before,
  after,
  overlays = [],
  drift = 0,
  className,
}: DiffViewerProps) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [showOverlays, setShowOverlays] = useState(true);

  // Mock images if not provided
  const beforeUrl = before || "/placeholder-before.jpg";
  const afterUrl = after || "/placeholder-after.jpg";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Before / After Comparison</CardTitle>
          <div className="flex items-center gap-2">
            {overlays.length > 0 && (
              <button
                onClick={() => setShowOverlays(!showOverlays)}
                className="p-2 rounded hover:bg-neutral-800"
              >
                {showOverlays ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            )}
            {drift > 0 && (
              <Badge variant={drift > 50 ? "destructive" : "secondary"}>
                Drift: {drift.toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Slider Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Before</span>
            <span>After</span>
          </div>
          <Slider
            value={sliderValue}
            onValueChange={setSliderValue}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Image Comparison */}
        <div className="relative w-full aspect-video bg-neutral-900 rounded-lg overflow-hidden">
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)`,
            }}
          >
            <img
              src={beforeUrl}
              alt="Before"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23111' width='800' height='600'/%3E%3Ctext fill='%666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='monospace' font-size='14'%3EBefore%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              clipPath: `inset(0 0 0 ${sliderValue[0]}%)`,
            }}
          >
            <img
              src={afterUrl}
              alt="After"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%222' width='800' height='600'/%3E%3Ctext fill='%888' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='monospace' font-size='14'%3EAfter%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Overlays */}
          {showOverlays && overlays.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {overlays.includes("mask") && (
                <div className="absolute inset-0 bg-teal-500/20 mix-blend-multiply" />
              )}
              {overlays.includes("heatmap") && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-red-500/10 to-purple-500/10" />
              )}
            </div>
          )}

          {/* Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/50 pointer-events-none transition-all duration-300"
            style={{ left: `${sliderValue[0]}%` }}
          />
        </div>

        {/* Overlay Legend */}
        {showOverlays && overlays.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {overlays.includes("mask") && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-teal-500/50 rounded" />
                <span>Alpha Mask</span>
              </div>
            )}
            {overlays.includes("heatmap") && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-red-500 rounded" />
                <span>Lighting Heatmap</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
