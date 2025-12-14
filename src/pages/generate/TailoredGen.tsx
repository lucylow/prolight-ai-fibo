// pages/generate/TailoredGen.tsx
import { enhancedBriaClient } from "@/services/enhancedBriaClient";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssetGrid } from "@/components/AssetGrid";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { useEnhancedStatus } from "@/hooks/useEnhancedStatus";
import { JobStatusPanel } from "@/components/JobStatusPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function TailoredGen() {
  const [modelId, setModelId] = useState("brand-v1");
  const [prompt, setPrompt] = useState("");
  const [structuredPrompt, setStructuredPrompt] = useState<string>("");
  const [images, setImages] = useState<Array<{ url?: string; image_url?: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string>();

  const { 
    status, 
    isLoading: isStatusLoading, 
    error: statusError, 
    retry: retryStatus,
    progress,
    elapsedTime 
  } = useEnhancedStatus(jobId, {
    onComplete: (completedStatus) => {
      if (completedStatus.data && typeof completedStatus.data === 'object') {
        const data = completedStatus.data as { images?: Array<{ url?: string; image_url?: string }> };
        if (data.images) {
          setImages(data.images);
          toast.success(`Generated ${data.images.length} image${data.images.length > 1 ? 's' : ''} with brand model!`);
        }
      }
    },
    onError: (error) => {
      toast.error(`Status check failed: ${error.message}`);
    },
  });

  async function generate() {
    if (!prompt && !structuredPrompt) {
      toast.error("Please enter a prompt or FIBO JSON");
      return;
    }

    if (!modelId.trim()) {
      toast.error("Please enter a Model ID");
      return;
    }

    setIsGenerating(true);
    setImages([]);
    setJobId(undefined);

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

      const res = await enhancedBriaClient.tailoredGeneration({
        model_id: modelId,
        prompt: typeof promptData === "string" ? promptData : undefined,
        structured_prompt: typeof promptData === "object" ? promptData : undefined,
        sync: false, // Use async for better UX
      });

      if (res.request_id) {
        setJobId(res.request_id);
        toast.success("Generation started! Monitoring progress...");
      } else if (res.images) {
        // Sync response
        setImages(res.images);
        toast.success("Image generated with brand model!");
      } else if (res.data && typeof res.data === 'object') {
        const data = res.data as { images?: Array<{ url?: string; image_url?: string }> };
        if (data.images) {
          setImages(data.images);
          toast.success("Image generated with brand model!");
        }
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('error' in error 
          ? String((error as { error?: string }).error)
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

  // Update images when status completes (fallback)
  useEffect(() => {
    if (status?.status === "COMPLETED") {
      if (status.data && typeof status.data === 'object') {
        const data = status.data as { images?: Array<{ url?: string; image_url?: string }> };
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        }
      }
      if (status.images && status.images.length > 0) {
        setImages(status.images);
      }
    }
  }, [status]);

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