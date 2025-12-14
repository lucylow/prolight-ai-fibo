// pages/generate/TextToImage.tsx
import { useState } from "react";
import { textToImage } from "@/api/bria";
import { AssetGrid } from "@/components/AssetGrid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TextToImage() {
  const [prompt, setPrompt] = useState("");
  const [structuredPrompt, setStructuredPrompt] = useState<string>("");
  const [images, setImages] = useState<any[]>([]);
  const [modelVersion, setModelVersion] = useState<"v1" | "v2">("v2");
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generate() {
    if (!prompt && !structuredPrompt) {
      toast.error("Please enter a prompt or FIBO JSON");
      return;
    }

    setIsGenerating(true);
    setImages([]);

    try {
      let promptData: string | object = prompt;
      
      // Try to parse as JSON if it looks like JSON
      if (structuredPrompt.trim()) {
        try {
          promptData = JSON.parse(structuredPrompt);
        } catch {
          toast.error("Invalid JSON format");
          setIsGenerating(false);
          return;
        }
      }

      const res = await textToImage({
        prompt: typeof promptData === "string" ? promptData : undefined,
        structured_prompt: typeof promptData === "object" ? promptData : undefined,
        model_version: modelVersion,
        seed,
        num_results: 1,
        sync: false,
      });

      if (res.request_id) {
        toast.success("Generation started! Check status for results.");
        // In a real app, you'd poll for status and get images from the status response
        setImages(res.data?.images || []);
      } else if (res.images) {
        setImages(res.images);
        toast.success("Image generated successfully!");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to generate image");
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Text → Image</h1>
        <p className="text-muted-foreground">
          Generate images from text descriptions or FIBO JSON prompts
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Text Prompt</Label>
          <Textarea
            id="prompt"
            className="w-full min-h-[100px]"
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fibo">FIBO JSON (optional)</Label>
          <Textarea
            id="fibo"
            className="w-full min-h-[200px] font-mono text-sm"
            placeholder='{"lighting": {...}, "subject": {...}}'
            value={structuredPrompt}
            onChange={(e) => setStructuredPrompt(e.target.value)}
          />
        </div>

        <div className="flex gap-4 items-end">
          <div className="space-y-2 flex-1">
            <Label htmlFor="model">Model Version</Label>
            <Select value={modelVersion} onValueChange={(v: "v1" | "v2") => setModelVersion(v)}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v1">V1</SelectItem>
                <SelectItem value="v2">V2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-1">
            <Label htmlFor="seed">Seed (optional)</Label>
            <input
              id="seed"
              type="number"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              placeholder="42"
              value={seed || ""}
              onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>

          <Button
            onClick={generate}
            disabled={isGenerating}
            className="mb-0"
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Generated Images</h2>
          <AssetGrid assets={images} />
        </div>
      )}
    </div>
  );
}