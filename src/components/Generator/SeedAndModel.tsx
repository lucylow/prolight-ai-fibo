import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shuffle, Lock } from "lucide-react";
import { useState } from "react";

interface SeedAndModelProps {
  seed?: number;
  onSeedChange: (seed: number | undefined) => void;
  modelVersion: string;
  onModelChange: (version: string) => void;
  availableModels?: Array<{ id: string; name: string; note?: string }>;
}

export function SeedAndModel({
  seed,
  onSeedChange,
  modelVersion,
  onModelChange,
  availableModels = [
    { id: "bria-fibo-v1", name: "Bria FIBO v1", note: "Standard" },
    { id: "bria-fibo-v2", name: "Bria FIBO v2", note: "Improved quality" },
    { id: "bria-fibo-hd", name: "Bria FIBO HD", note: "High resolution" },
  ],
}: SeedAndModelProps) {
  const [isPinned, setIsPinned] = useState(!!seed);

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    onSeedChange(newSeed);
    setIsPinned(true);
  };

  const handlePinSeed = () => {
    if (seed) {
      setIsPinned(true);
    } else {
      handleRandomSeed();
    }
  };

  const handleUnpinSeed = () => {
    setIsPinned(false);
    onSeedChange(undefined);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="model">Model Version</Label>
        </div>
        <Select value={modelVersion} onValueChange={onModelChange}>
          <SelectTrigger id="model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{model.name}</span>
                  {model.note && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {model.note}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="seed">Seed {isPinned && <Lock className="w-3 h-3 inline ml-1" />}</Label>
          {isPinned ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnpinSeed}
              className="h-6 text-xs"
            >
              Unpin
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRandomSeed}
              className="h-6 text-xs"
            >
              <Shuffle className="w-3 h-3 mr-1" />
              Random
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            id="seed"
            type="number"
            placeholder="Auto"
            value={seed || ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined;
              onSeedChange(val);
              if (val) setIsPinned(true);
            }}
            disabled={!isPinned && !seed}
          />
          {seed && !isPinned && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePinSeed}
              title="Pin this seed for deterministic reproduction"
            >
              <Lock className="w-4 h-4" />
            </Button>
          )}
        </div>
        {seed && (
          <p className="text-xs text-muted-foreground">
            Seed {seed} will produce deterministic results
          </p>
        )}
      </div>
    </div>
  );
}

