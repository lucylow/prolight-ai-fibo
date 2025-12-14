// pages/generate/VideoEditor.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Upload, Video, CheckCircle2, XCircle } from "lucide-react";
import { AssetGrid } from "@/components/AssetGrid";
import {
  uploadVideoAndCreateJob,
  subscribeToJob,
  getJobStatus,
  type CreateJobRequest,
} from "@/api/video-editing";

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [operation, setOperation] = useState<CreateJobRequest['operation']>("increase_resolution");
  const [params, setParams] = useState<CreateJobRequest['params']>({});
  const [requestId, setRequestId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [result, setResult] = useState<{ url?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  async function handleUploadAndProcess() {
    if (!file) {
      toast.error("Please select a video file");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setRequestId(null);
    setResult(null);
    setJobStatus("");

    try {
      // Upload video and create job
      const job = await uploadVideoAndCreateJob(
        file,
        operation,
        params,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setRequestId(job.request_id);
      setJobStatus("submitted");
      toast.success("Video uploaded and job created!");

      // Subscribe to job updates via SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      eventSourceRef.current = subscribeToJob(
        job.request_id,
        (update) => {
          setJobStatus(update.status);
          if (update.result?.url) {
            setResult({ url: update.result.url });
            toast.success("Video processing completed!");
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          }
        },
        (error) => {
          console.error("SSE connection error:", error);
          toast.warning("SSE connection lost, falling back to polling...");
          // Fallback to polling if SSE fails
          if (requestId) {
            pollJobStatus(requestId);
          }
        }
      );

    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || "Failed to upload and process video");
      console.error("Video editing error:", error);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }

  // Fallback polling function if SSE fails
  async function pollJobStatus(requestId: string) {
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(requestId);
        setJobStatus(status.status);
        if (status.result?.url) {
          setResult({ url: status.result.url });
          clearInterval(interval);
          toast.success("Video processing completed!");
        } else if (status.status === "failed" || status.status === "cancelled" || status.status === "error") {
          clearInterval(interval);
          toast.error(`Job ${status.status}. Please try again.`);
          setJobStatus(status.status);
        }
      } catch (error) {
        console.error("Failed to poll job status:", error);
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);
  }

  function getStatusIcon() {
    if (jobStatus === "succeeded" || jobStatus === "completed") {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (jobStatus === "failed" || jobStatus === "error") {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (jobStatus) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Video Editing</h1>
        <p className="text-muted-foreground">
          Upload videos and apply AI-powered editing operations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload & Configure</CardTitle>
            <CardDescription>
              Select a video file and choose an editing operation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-file">Video File</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="operation">Operation</Label>
              <Select value={operation} onValueChange={(v) => setOperation(v as CreateJobRequest['operation'])}>
                <SelectTrigger id="operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase_resolution">Increase Resolution (Upscale)</SelectItem>
                  <SelectItem value="remove_background">Remove Background</SelectItem>
                  <SelectItem value="foreground_mask">Foreground Mask</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {operation === "increase_resolution" && (
              <div className="space-y-2">
                <Label htmlFor="desired-increase">Scale Factor</Label>
                <Select
                  value={String(params.desired_increase || 2)}
                  onValueChange={(v) => setParams({ ...params, desired_increase: parseInt(v) })}
                >
                  <SelectTrigger id="desired-increase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2x (Double Resolution)</SelectItem>
                    <SelectItem value="4">4x (Quadruple Resolution)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {operation === "remove_background" && (
              <div className="space-y-2">
                <Label htmlFor="background-color">Background Color</Label>
                <Select
                  value={params.background_color || "Transparent"}
                  onValueChange={(v) => setParams({ ...params, background_color: v })}
                >
                  <SelectTrigger id="background-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transparent">Transparent</SelectItem>
                    <SelectItem value="Black">Black</SelectItem>
                    <SelectItem value="White">White</SelectItem>
                    <SelectItem value="Gray">Gray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button
              onClick={handleUploadAndProcess}
              disabled={isLoading || !file}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Process
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Results</CardTitle>
            <CardDescription>
              Job status and processed video output
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestId && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <div>
                    <p className="font-medium">Job Status</p>
                    <p className="text-sm text-muted-foreground">
                      {jobStatus || "Submitted"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Request ID: {requestId}
                </p>
              </div>
            )}

            {result?.url ? (
              <div className="space-y-2">
                <h3 className="font-semibold">Processed Video</h3>
                <video
                  src={result.url}
                  controls
                  className="w-full rounded-lg border"
                />
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download video
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                <Video className="w-16 h-16 mb-4 opacity-50" />
                <p>Processed video will appear here</p>
                {!requestId && (
                  <p className="text-sm mt-2">Upload and process a video to get started</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Increase Resolution:</strong> Upscale videos up to 8K resolution. Supports 2x and 4x scaling.</p>
            <p><strong>Remove Background:</strong> Remove or replace video backgrounds with transparent, solid colors, or custom backgrounds.</p>
            <p><strong>Foreground Mask:</strong> Generate foreground masks for advanced compositing workflows.</p>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Note:</strong> Video processing is asynchronous. Large videos may take several minutes to process.
              Maximum input duration: 60 seconds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
