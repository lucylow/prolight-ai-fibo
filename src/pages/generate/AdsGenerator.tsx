// pages/generate/AdsGenerator.tsx
import { generateAds } from "@/api/bria";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStatus } from "@/hooks/useStatus";
import { JobStatusPanel } from "@/components/JobStatusPanel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AssetGrid } from "@/components/AssetGrid";

export default function AdsGenerator() {
  const [brandId, setBrandId] = useState("nike_brand");
  const [templateId, setTemplateId] = useState("summer_sale");
  const [formats, setFormats] = useState<string[]>(["1080x1080", "1200x628", "story"]);
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string>();
  const [assets, setAssets] = useState<Array<{ url?: string; image_url?: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { status } = useStatus(jobId);

  async function run() {
    setIsGenerating(true);
    setJobId(undefined);
    setAssets([]);

    try {
      const res = await generateAds({
        brand_id: brandId,
        template_id: templateId,
        formats,
        prompt: prompt || undefined,
      });

      if (res.request_id) {
        setJobId(res.request_id);
        toast.success("Ads generation started!");
      } else {
        toast.error("Failed to start generation");
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || "Failed to generate ads");
      console.error("Ads generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  // Update assets when status completes
  useEffect(() => {
    if (status?.status === "COMPLETED" && status?.data?.images) {
      setAssets(status.data.images);
    }
  }, [status]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ads Generator</h1>
        <p className="text-muted-foreground">
          Automatically generate advertisement images at scale with templates and branding
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand-id">Brand ID</Label>
            <Input
              id="brand-id"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              placeholder="nike_brand"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-id">Template ID</Label>
            <Input
              id="template-id"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="summer_sale"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="formats">Formats (comma-separated)</Label>
          <Input
            id="formats"
            value={formats.join(", ")}
            onChange={(e) => setFormats(e.target.value.split(",").map(f => f.trim()).filter(Boolean))}
            placeholder="1080x1080, 1200x628, story"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Ad Description (optional)</Label>
          <Textarea
            id="prompt"
            className="w-full min-h-[100px]"
            placeholder="Describe the advertisement..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <Button
          onClick={run}
          disabled={isGenerating}
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Ads
        </Button>
      </div>

      {jobId && (
        <div className="space-y-4">
          <JobStatusPanel requestId={jobId} status={status} />
        </div>
      )}

      {assets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Generated Ads</h2>
          <AssetGrid assets={assets} />
        </div>
      )}
    </div>
  );
}