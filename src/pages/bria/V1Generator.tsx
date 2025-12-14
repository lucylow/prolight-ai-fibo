import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface GuidanceMethod {
  method: "controlnet_canny" | "controlnet_depth" | "controlnet_recoloring" | "controlnet_color_grid";
  scale: number;
  image_base64?: string;
  image_url?: string;
}

export default function V1Generator() {
  const { user } = useAuth();
  
  // File & upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [presignedGetUrl, setPresignedGetUrl] = useState<string | null>(null);

  // Generation state
  const [prompt, setPrompt] = useState("A dramatic studio product shot of a watch, studio lighting");
  const [pipeline, setPipeline] = useState<"base" | "fast" | "hd">("base");
  const [modelVersion, setModelVersion] = useState("3.2");
  const [guidanceMethod, setGuidanceMethod] = useState<GuidanceMethod["method"]>("controlnet_canny");
  const [guidanceScale, setGuidanceScale] = useState(1.0);
  const [numResults, setNumResults] = useState(1);
  const [sync, setSync] = useState(false);

  // Job state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  function log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `${timestamp}: ${message}`]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll job status if async
  useEffect(() => {
    if (!requestId || sync || !isGenerating) return;

    const pollStatus = async () => {
      try {
        // Try to get status from Bria status endpoint or your status service
        const resp = await axios.get(`${API_BASE}/api/v1/status/${requestId}`, {
          headers: user ? { Authorization: `Bearer ${user.id}` } : {},
        });
        
        const data = resp.data;
        const status = data.status || data.state || "unknown";
        setJobStatus(status);

        if (status === "completed" || status === "succeeded" || status === "done") {
          setJobResult(data.result || data);
          setIsGenerating(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          log("Generation completed!");
          toast.success("Image generation completed!");
        } else if (status === "failed" || status === "error") {
          setIsGenerating(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          log("Generation failed: " + (data.error || "Unknown error"));
          toast.error("Generation failed");
        }
      } catch (err: any) {
        console.error("Status poll error:", err);
        // Continue polling on error
      }
    };

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [requestId, sync, isGenerating, user]);

  // Upload file to S3 using presigned PUT URL
  async function uploadFileToS3(presignedPutUrl: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedPutUrl);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          log("File uploaded to S3");
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Upload network error"));
      };

      xhr.send(file);
    });
  }

  // Get presigned URLs from server
  async function getPresignedUrls(filename: string, contentType: string) {
    const resp = await axios.get(`${API_BASE}/api/s3/presign`, {
      params: { filename, contentType, expiresSec: 3600 },
      headers: user ? { Authorization: `Bearer ${user.id}` } : {},
    });
    return resp.data;
  }

  // Main generation handler
  async function handleGenerate() {
    if (!file && !prompt) {
      toast.error("Please provide a prompt or upload a guidance image");
      return;
    }

    setIsGenerating(true);
    setJobStatus("submitting");
    setJobResult(null);
    setRequestId(null);
    setLogs([]);

    try {
      let guidanceImageUrl: string | undefined;

      // If file provided, upload to S3 first
      if (file) {
        log("Requesting presigned URLs...");
        const { key, presignedPutUrl, presignedGetUrl: getUrl } = await getPresignedUrls(
          file.name,
          file.type
        );
        setS3Key(key);
        setPresignedGetUrl(getUrl);

        log("Uploading file to S3...");
        await uploadFileToS3(presignedPutUrl, file);
        guidanceImageUrl = getUrl;
      }

      // Build request body
      const requestBody: any = {
        pipeline,
        model_version: modelVersion,
        prompt,
        num_results: numResults,
        sync,
      };

      // Add guidance method if image provided
      if (guidanceImageUrl) {
        requestBody.guidance_methods = [
          {
            method: guidanceMethod,
            scale: guidanceScale,
            image_url: guidanceImageUrl,
          },
        ];
      }

      log(`Calling /api/v1/generate/image (pipeline: ${pipeline}, sync: ${sync})...`);
      const resp = await axios.post(`${API_BASE}/api/v1/generate/image`, requestBody, {
        headers: user ? { Authorization: `Bearer ${user.id}` } : {},
      });

      const data = resp.data;
      log("Generation request submitted");

      // Handle response
      if (sync || data.result) {
        // Synchronous response
        setJobResult(data);
        setJobStatus("completed");
        setIsGenerating(false);
        log("Generation completed (sync)");
        toast.success("Image generated!");
      } else {
        // Asynchronous response
        const reqId = data.request_id || data.requestId || data.id;
        if (reqId) {
          setRequestId(reqId);
          setJobStatus("submitted");
          log(`Async job started: ${reqId}`);
          toast.info("Generation started (async mode)");
        } else {
          log("Warning: No request_id in async response");
          setJobStatus("unknown");
        }
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      log(`Error: ${errorMsg}`);
      toast.error(`Generation failed: ${errorMsg}`);
      setIsGenerating(false);
      setJobStatus("error");
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bria V1 Image Generation</CardTitle>
          <CardDescription>
            Generate images using Bria V1 pipelines with ControlNet guidance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt..."
            />
          </div>

          {/* Pipeline & Model Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select value={pipeline} onValueChange={(v) => setPipeline(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="hd">HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model Version</Label>
              <Select value={modelVersion} onValueChange={setModelVersion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3.2">3.2</SelectItem>
                  <SelectItem value="2.3">2.3</SelectItem>
                  {pipeline === "hd" && <SelectItem value="2.2">2.2</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guidance Image Upload */}
          <div className="space-y-2">
            <Label>Guidance Image (Optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFile(f || null);
                setUploadProgress(null);
              }}
            />
            {file && (
              <div className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
            {uploadProgress !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>

          {/* Guidance Method Settings */}
          {file && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>ControlNet Method</Label>
                <Select
                  value={guidanceMethod}
                  onValueChange={(v) => setGuidanceMethod(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controlnet_canny">Canny (Edges)</SelectItem>
                    <SelectItem value="controlnet_depth">Depth</SelectItem>
                    <SelectItem value="controlnet_recoloring">Recoloring</SelectItem>
                    <SelectItem value="controlnet_color_grid">Color Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Guidance Scale: {guidanceScale.toFixed(2)}</Label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Results</Label>
              <Input
                type="number"
                min="1"
                max="4"
                value={numResults}
                onChange={(e) => setNumResults(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sync}
                  onChange={(e) => setSync(e.target.checked)}
                  className="rounded"
                />
                <span>Synchronous (wait for result)</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="w-full"
            size="lg"
          >
            {isGenerating ? "Generating..." : "Generate Image"}
          </Button>
        </CardContent>
      </Card>

      {/* Status & Results */}
      {(jobStatus || jobResult) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status & Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestId && (
              <div>
                <strong>Request ID:</strong> {requestId}
              </div>
            )}
            {jobStatus && (
              <div>
                <strong>Status:</strong> {jobStatus}
              </div>
            )}
            {jobResult && (
              <div className="space-y-4">
                <h3 className="font-semibold">Generated Images:</h3>
                {jobResult.result && Array.isArray(jobResult.result) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {jobResult.result.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        {item.urls && item.urls.length > 0 ? (
                          <>
                            <img
                              src={item.urls[0]}
                              alt={`Result ${idx + 1}`}
                              className="w-full rounded-lg border"
                            />
                            <div className="text-sm text-muted-foreground">
                              Seed: {item.seed || "N/A"}
                            </div>
                            <a
                              href={item.urls[0]}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Open in new tab
                            </a>
                          </>
                        ) : (
                          <div className="p-4 border rounded">No image URL</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : jobResult.image_url ? (
                  <div>
                    <img
                      src={jobResult.image_url}
                      alt="Result"
                      className="w-full max-w-md rounded-lg border"
                    />
                  </div>
                ) : (
                  <div className="p-4 border rounded">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(jobResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">No logs yet...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
