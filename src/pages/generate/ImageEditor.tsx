// pages/generate/ImageEditor.tsx
import { enhancedBriaClient } from "@/services/enhancedBriaClient";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetGrid } from "@/components/AssetGrid";
import { toast } from "sonner";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { useEnhancedStatus } from "@/hooks/useEnhancedStatus";
import { JobStatusPanel } from "@/components/JobStatusPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ImageEditor() {
  const [imageUrl, setImageUrl] = useState("");
  const [assetId, setAssetId] = useState("");
  const [operation, setOperation] = useState("remove_background");
  const [results, setResults] = useState<Array<{ url?: string; image_url?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
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
          setResults(data.images);
          toast.success(`Image edited successfully! Generated ${data.images.length} result${data.images.length > 1 ? 's' : ''}.`);
        }
      }
    },
    onError: (error) => {
      toast.error(`Status check failed: ${error.message}`);
    },
  });

  async function onboard() {
    if (!imageUrl.trim()) {
      toast.error("Please enter an image URL");
      return;
    }

    setIsOnboarding(true);
    try {
      const res = await enhancedBriaClient.onboardImage(imageUrl);
      if (res.data?.asset_id) {
        setAssetId(res.data.asset_id);
        toast.success("Image onboarded successfully!");
      } else if (res.data && typeof res.data === 'object' && 'asset_id' in res.data) {
        setAssetId(String(res.data.asset_id));
        toast.success("Image onboarded successfully!");
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('error' in error 
          ? String((error as { error?: string }).error)
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || "Failed to onboard image");
      console.error("Image onboarding error:", error);
    } finally {
      setIsOnboarding(false);
    }
  }

  async function runOperation() {
    if (!assetId) {
      toast.error("Please onboard an image first");
      return;
    }

    setIsLoading(true);
    setResults([]);
    setJobId(undefined);

    try {
      const res = await enhancedBriaClient.editImage({
        asset_id: assetId,
        operation,
        params: {},
      });

      if (res.request_id) {
        setJobId(res.request_id);
        toast.success("Image editing started! Monitoring progress...");
      } else if (res.images) {
        setResults(res.images);
        toast.success("Image edited successfully!");
      } else if (res.data && typeof res.data === 'object') {
        const data = res.data as { images?: Array<{ url?: string; image_url?: string }> };
        if (data.images) {
          setResults(data.images);
          toast.success("Image edited successfully!");
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
      toast.error(errorMessage || "Failed to edit image");
      console.error("Image editing error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Update results when status completes (fallback)
  useEffect(() => {
    if (status?.status === "COMPLETED") {
      if (status.data && typeof status.data === 'object') {
        const data = status.data as { images?: Array<{ url?: string; image_url?: string }> };
        if (data.images && data.images.length > 0) {
          setResults(data.images);
        }
      }
      if (status.images && status.images.length > 0) {
        setResults(status.images);
      }
    }
  }, [status]);

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
            <Button onClick={onboard} disabled={isOnboarding || !imageUrl}>
              {isOnboarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isOnboarding && <Upload className="mr-2 h-4 w-4" />}
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
          disabled={isLoading || isStatusLoading || !assetId}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply Operation
        </Button>
      </div>

      {jobId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Editing Progress</CardTitle>
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
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Edited Images ({results.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                results.forEach((result, index) => {
                  const url = result.url || result.image_url;
                  if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `edited-${operation}-${index + 1}.jpg`;
                    link.click();
                  }
                });
                toast.success(`Downloaded ${results.length} image${results.length > 1 ? 's' : ''}`);
              }}
            >
              Download All
            </Button>
          </div>
          <AssetGrid assets={results} />
        </div>
      )}
    </div>
  );
}
