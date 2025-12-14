// pages/generate/VideoEditor.tsx
import { editVideo, onboardImage } from "@/api/bria";
import { useStatus } from "@/hooks/useStatus";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusPanel } from "@/components/JobStatusPanel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AssetGrid } from "@/components/AssetGrid";

export default function VideoEditor() {
  const [videoUrl, setVideoUrl] = useState("");
  const [assetId, setAssetId] = useState("");
  const [operation, setOperation] = useState("increase_resolution");
  const [targetResolution, setTargetResolution] = useState("8k");
  const [reqId, setReqId] = useState<string>();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { status } = useStatus(reqId);

  async function onboard() {
    if (!videoUrl) {
      toast.error("Please enter a video URL");
      return;
    }

    setIsLoading(true);
    try {
      // Note: Video onboarding might use a different endpoint
      // This is a placeholder - adjust based on actual API
      const res = await onboardImage({ image_url: videoUrl });
      if (res.asset_id) {
        setAssetId(res.asset_id);
        toast.success("Video onboarded successfully!");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to onboard video");
    } finally {
      setIsLoading(false);
    }
  }

  async function runOperation() {
    if (!assetId) {
      toast.error("Please onboard a video first");
      return;
    }

    setIsLoading(true);
    setReqId(undefined);
    setResults([]);

    try {
      const res = await editVideo(operation, {
        asset_id: assetId,
        target_resolution: targetResolution,
      });

      if (res.request_id) {
        setReqId(res.request_id);
        toast.success("Video editing started!");
      } else {
        toast.error("Failed to start video editing");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to edit video");
      console.error("Video editing error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Update results when status completes
  useEffect(() => {
    if (status?.status === "COMPLETED" && status?.data?.video_url) {
      setResults([{ url: status.data.video_url }]);
    }
  }, [status]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Video Editing</h1>
        <p className="text-muted-foreground">
          Advanced video editing operations (async processing)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="video-url">Video URL</Label>
          <div className="flex gap-2">
            <Input
              id="video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
            />
            <Button onClick={onboard} disabled={isLoading || !videoUrl}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Onboard
            </Button>
          </div>
          {assetId && (
            <p className="text-sm text-muted-foreground">Asset ID: {assetId}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="operation">Operation</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger id="operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase_resolution">Increase Resolution</SelectItem>
                <SelectItem value="enhance">Enhance</SelectItem>
                <SelectItem value="stabilize">Stabilize</SelectItem>
                <SelectItem value="color_correction">Color Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operation === "increase_resolution" && (
            <div className="space-y-2">
              <Label htmlFor="resolution">Target Resolution</Label>
              <Select value={targetResolution} onValueChange={setTargetResolution}>
                <SelectTrigger id="resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4k">4K</SelectItem>
                  <SelectItem value="8k">8K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button
          onClick={runOperation}
          disabled={isLoading || !assetId}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply Operation
        </Button>
      </div>

      {reqId && (
        <div className="space-y-4">
          <JobStatusPanel requestId={reqId} status={status} />
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Processed Video</h2>
          <AssetGrid assets={results} />
        </div>
      )}
    </div>
  );
}