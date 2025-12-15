// pages/generate/AdsGenerator.tsx
import { enhancedBriaClient } from "@/services/enhancedBriaClient";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEnhancedStatus } from "@/hooks/useEnhancedStatus";
import { JobStatusPanel } from "@/components/JobStatusPanel";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { AssetGrid } from "@/components/AssetGrid";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdsGenerator() {
  const [brandId, setBrandId] = useState("nike_brand");
  const [templateId, setTemplateId] = useState("summer_sale");
  const [formats, setFormats] = useState<string[]>(["1080x1080", "1200x628", "story"]);
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string>();
  const [assets, setAssets] = useState<Array<{ url?: string; image_url?: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
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
          setAssets(data.images);
          toast.success(`Generated ${data.images.length} ad${data.images.length > 1 ? 's' : ''}!`);
        }
      }
    },
    onError: (error) => {
      toast.error(`Status check failed: ${error.message}`);
    },
  });

  async function run() {
    if (!brandId.trim() || !templateId.trim()) {
      toast.error("Please provide both Brand ID and Template ID");
      return;
    }

    setIsGenerating(true);
    setJobId(undefined);
    setAssets([]);

    try {
      const res = await enhancedBriaClient.generateAds({
        brand_id: brandId,
        template_id: templateId,
        formats,
        prompt: prompt || undefined,
      });

      if (res.request_id) {
        setJobId(res.request_id);
        toast.success("Ads generation started! Monitoring progress...");
      } else {
        toast.error("Failed to start generation - no request ID returned");
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('error' in error 
          ? String((error as { error?: string }).error)
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

  // Update assets when status completes (fallback)
  useEffect(() => {
    if (status?.status === "COMPLETED") {
      if (status.data && typeof status.data === 'object') {
        const data = status.data as { images?: Array<{ url?: string; image_url?: string }> };
        if (data.images && data.images.length > 0) {
          setAssets(data.images);
        }
      }
      // Also check direct images array
      if (status.images && status.images.length > 0) {
        setAssets(status.images);
      }
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generation Progress</CardTitle>
                {statusError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryStatus}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Status Check
                  </Button>
                )}
              </div>
              <CardDescription>
                Request ID: {jobId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isStatusLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Elapsed: {Math.floor(elapsedTime / 1000)}s
                  </p>
                </div>
              )}
              <JobStatusPanel requestId={jobId} status={status} />
            </CardContent>
          </Card>
        </div>
      )}

      {assets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Generated Ads ({assets.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                assets.forEach((asset, index) => {
                  const url = asset.url || asset.image_url;
                  if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `ad-${index + 1}.jpg`;
                    link.click();
                  }
                });
                toast.success(`Downloaded ${assets.length} ad${assets.length > 1 ? 's' : ''}`);
              }}
            >
              Download All
            </Button>
          </div>
          <AssetGrid assets={assets} />
        </div>
      )}
    </div>
  );
}
