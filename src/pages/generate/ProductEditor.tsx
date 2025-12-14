// pages/generate/ProductEditor.tsx
import { editProductShot, onboardImage } from "@/api/bria";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetGrid } from "@/components/AssetGrid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ProductEditor() {
  const [imageUrl, setImageUrl] = useState("");
  const [assetId, setAssetId] = useState("");
  const [operation, setOperation] = useState("packshot");
  const [background, setBackground] = useState("white");
  const [relight, setRelight] = useState(true);
  const [outputs, setOutputs] = useState<string[]>(["beauty"]);
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
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to onboard image");
    } finally {
      setIsLoading(false);
    }
  }

  async function run() {
    if (!assetId) {
      toast.error("Please onboard an image first");
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const res = await editProductShot({
        asset_id: assetId,
        operation,
        params: {
          background,
          relight,
          outputs,
        },
      });

      if (res.request_id) {
        toast.success("Product editing started! Check status for results.");
        setResults(res.data?.images || []);
      } else if (res.images) {
        setResults(res.images);
        toast.success("Product shot edited successfully!");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to edit product shot");
      console.error("Product editing error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Product Editor</h1>
        <p className="text-muted-foreground">
          Edit product shots with packshots, backgrounds, and relighting
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
              placeholder="https://example.com/product.jpg"
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
              <SelectItem value="packshot">Packshot</SelectItem>
              <SelectItem value="isolate">Isolate</SelectItem>
              <SelectItem value="add_shadow">Add Shadow</SelectItem>
              <SelectItem value="replace_background">Replace Background</SelectItem>
              <SelectItem value="enhance_product">Enhance Product</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="background">Background</Label>
          <Select value={background} onValueChange={setBackground}>
            <SelectTrigger id="background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="white">White</SelectItem>
              <SelectItem value="transparent">Transparent</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="relight"
            checked={relight}
            onChange={(e) => setRelight(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="relight">Enable Relighting</Label>
        </div>

        <Button
          onClick={run}
          disabled={isLoading || !assetId}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Edit Product Shot
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