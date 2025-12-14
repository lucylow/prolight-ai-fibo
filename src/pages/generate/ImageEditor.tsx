// pages/generate/ImageEditor.tsx
import { editImage, onboardImage } from "@/api/bria";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetGrid } from "@/components/AssetGrid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ImageEditor() {
  const [imageUrl, setImageUrl] = useState("");
  const [assetId, setAssetId] = useState("");
  const [operation, setOperation] = useState("remove_background");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function onboard() {
    if (!imageUrl) {
      toast.error("Please enter an image URL");
      return;
    }

    setIsLoading(true);
    try {
      const res = await onboardImage({ image_url: imageUrl });
      if (res.asset_id) {
        setAssetId(res.asset_id);
        toast.success("Image onboarded successfully!");
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || "Failed to onboard image");
    } finally {
      setIsLoading(false);
    }
  }

  async function runOperation() {
    if (!assetId) {
      toast.error("Please onboard an image first");
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const res = await editImage(operation, {
        asset_id: assetId,
      });

      if (res.request_id) {
        toast.success("Image editing started! Check status for results.");
        setResults(res.data?.images || []);
      } else if (res.images) {
        setResults(res.images);
        toast.success("Image edited successfully!");
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || "Failed to edit image");
      console.error("Image editing error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Image Editing</h1>
        <p className="text-muted-foreground">
          Edit and transform user images with various operations
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="image-url">Image URL</Label>
          <div className="flex gap-2">
            <Input
              id="image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <Button onClick={onboard} disabled={isLoading || !imageUrl}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Onboard
            </Button>
          </div>
          {assetId && (
            <p className="text-sm text-muted-foreground">Asset ID: {assetId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="operation">Operation</Label>
          <Select value={operation} onValueChange={setOperation}>
            <SelectTrigger id="operation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remove_background">Remove Background</SelectItem>
              <SelectItem value="expand">Expand</SelectItem>
              <SelectItem value="enhance">Enhance</SelectItem>
              <SelectItem value="generative_fill">Generative Fill</SelectItem>
              <SelectItem value="crop">Crop</SelectItem>
              <SelectItem value="upscale">Upscale</SelectItem>
              <SelectItem value="color_correction">Color Correction</SelectItem>
              <SelectItem value="noise_reduction">Noise Reduction</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={runOperation}
          disabled={isLoading || !assetId}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply Operation
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Edited Images</h2>
          <AssetGrid assets={results} />
        </div>
      )}
    </div>
  );
}