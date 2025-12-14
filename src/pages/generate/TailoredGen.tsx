// pages/generate/TailoredGen.tsx
import { tailoredTextToImage } from "@/api/bria";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssetGrid } from "@/components/AssetGrid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TailoredGen() {
  const [modelId, setModelId] = useState("brand-v1");
  const [prompt, setPrompt] = useState("");
  const [structuredPrompt, setStructuredPrompt] = useState<string>("");
  const [images, setImages] = useState<Array<{ url?: string; image_url?: string }>>([]);
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

      const res = await tailoredTextToImage({
        model_id: modelId,
        prompt: typeof promptData === "string" ? promptData : undefined,
        structured_prompt: typeof promptData === "object" ? promptData : undefined,
      });

      if (res.request_id) {
        toast.success("Generation started! Check status for results.");
        setImages(res.data?.images || []);
      } else if (res.images) {
        setImages(res.images);
        toast.success("Image generated with brand model!");
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || "Failed to generate image");
      console.error("Tailored generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tailored Model Generation</h1>
        <p className="text-muted-foreground">
          Generate images using your trained brand-specific model
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model-id">Model ID</Label>
          <Input
            id="model-id"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="brand-v1"
          />
        </div>

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

        <Button
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate with Brand Model
        </Button>
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