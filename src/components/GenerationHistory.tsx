/**
 * Generation History Component
 * Visual grid of generated images with reload capability
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProlightStore } from '@/stores/useProlightStore';
import { History, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GenerationHistory() {
  const { history, clearHistory, reproduceGeneration } = useProlightStore();

  if (history.length === 0) {
    return (
      <Card className="bg-[#0f1419] border-[#2a2f4a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#e0e0e0]">
            <History className="w-5 h-5 text-[#667eea]" />
            Generation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#667] text-center py-8">
            No generations yet. Start creating to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0f1419] border-[#2a2f4a]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#e0e0e0]">
            <History className="w-5 h-5 text-[#667eea]" />
            Generation History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs text-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg overflow-hidden border border-[#2a2f4a] bg-[#1a1f2e] hover:border-[#667eea] transition-all cursor-pointer"
            >
              <div className="aspect-square relative">
                <img
                  src={item.image_url}
                  alt={item.prompt || 'Generated image'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      reproduceGeneration(item);
                    }}
                    className="bg-[#667eea] hover:bg-[#5568d3]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reproduce
                  </Button>
                </div>
                {item.isReproduction && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-[#48bb78]/90 text-white text-xs">
                      ↺ Reproduction
                    </Badge>
                  </div>
                )}
                {item.seed && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-xs font-mono">
                      {item.seed}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-[#999] truncate" title={item.prompt}>
                  {item.prompt || 'No prompt'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

