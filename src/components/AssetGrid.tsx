// components/AssetGrid.tsx
import { cn } from "@/lib/utils";

interface Asset {
  url?: string;
  image_url?: string;
  asset_url?: string;
  id?: string;
  asset_id?: string;
}

interface AssetGridProps {
  assets: Asset[];
  className?: string;
  onAssetClick?: (asset: Asset, index: number) => void;
}

export function AssetGrid({ assets, className, onAssetClick }: AssetGridProps) {
  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No assets to display
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {assets.map((asset, i) => {
        const url = asset.url || asset.image_url || asset.asset_url;
        const id = asset.id || asset.asset_id || i;
        
        if (!url) return null;

        return (
          <div
            key={id}
            className={cn(
              "relative group rounded-lg border overflow-hidden bg-card",
              onAssetClick && "cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            )}
            onClick={() => onAssetClick?.(asset, i)}
          >
            <img
              src={url}
              alt={`Asset ${i + 1}`}
              className="w-full h-full object-cover aspect-square"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        );
      })}
    </div>
  );
}