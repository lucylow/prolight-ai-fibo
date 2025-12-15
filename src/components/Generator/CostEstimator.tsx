import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { useMemo } from "react";

interface CostEstimatorProps {
  numVariants: number;
  width: number;
  height: number;
  hasControlNet: boolean;
  numGuidanceImages: number;
  modelVersion: string;
}

export function CostEstimator({
  numVariants,
  width,
  height,
  hasControlNet,
  numGuidanceImages,
  modelVersion,
}: CostEstimatorProps) {
  const estimate = useMemo(() => {
    // Simple client-side estimation (matches backend logic)
    const baseCostCents = 3;
    const basePixels = 1024 * 1024;
    const imagePixels = width * height;
    const sizeMultiplier = imagePixels / basePixels;
    
    let costPerVariant = baseCostCents * sizeMultiplier;
    
    if (hasControlNet) {
      costPerVariant += 1;
    }
    
    if (numGuidanceImages > 0) {
      costPerVariant += 0.5 * numGuidanceImages;
    }
    
    if (modelVersion.includes("hd") || modelVersion.includes("v2")) {
      costPerVariant *= 1.5;
    }
    
    const totalCents = Math.ceil(costPerVariant * numVariants);
    return {
      perVariant: Math.ceil(costPerVariant),
      total: totalCents,
      totalDollars: (totalCents / 100).toFixed(2),
    };
  }, [numVariants, width, height, hasControlNet, numGuidanceImages, modelVersion]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Coins className="w-4 h-4" />
          Cost Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Per variant:</span>
          <Badge variant="outline">{estimate.perVariant}¢</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total ({numVariants} variants):</span>
          <Badge variant="default" className="text-base">
            ${estimate.totalDollars}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

