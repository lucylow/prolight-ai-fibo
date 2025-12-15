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
import {
  CONTROLNET_METHODS,
  validateGuidanceImage,
  getRecommendedScale,
  getScaleDescription,
  createImagePreview,
  revokeImagePreview,
} from "@/utils/controlnet-helpers";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface GuidanceMethod {
  method: "controlnet_canny" | "controlnet_depth" | "controlnet_recoloring" | "controlnet_color_grid";
  scale: number;
  image_base64?: string;
  image_url?: string;
  preview?: string; // For UI preview
}

const CONTROLNET_INFO: Record<string, { name: string; description: string; bestFor: string[] }> = {
  controlnet_canny: {
    name: "Canny Edge Detection",
    description: "Preserves structure and outlines. Best for maintaining composition and shape.",
    bestFor: ["Architectural renders", "Product outlines", "Structural preservation"]
  },
  controlnet_depth: {
    name: "Depth Map",
    description: "Controls 3D spatial relationships. Excellent for lighting-sensitive scenes.",
    bestFor: ["Lighting control", "3D spatial accuracy", "ProLight AI workflows"]
  },
  controlnet_recoloring: {
    description: "Maintains structure while changing colors. Great for style transfer.",
    name: "Recoloring",
    bestFor: ["Color style transfer", "Maintaining structure with new colors"]
  },
  controlnet_color_grid: {
    name: "Color Grid",
    description: "Controls color distribution and placement. Useful for composition control.",
    bestFor: ["Color composition", "Palette control", "Artistic color placement"]
  }
};

export default function V1Generator() {
  const { user } = useAuth();
  
  // File & upload state (support multiple files for multiple ControlNets)
  const [files, setFiles] = useState<Map<number, File>>(new Map());
  const [uploadProgress, setUploadProgress] = useState<Map<number, number>>(new Map());
  const [s3Keys, setS3Keys] = useState<Map<number, string>>(new Map());
  const [presignedGetUrls, setPresignedGetUrls] = useState<Map<number, string>>(new Map());

  // Generation state
  const [prompt, setPrompt] = useState("A dramatic studio product shot of a watch, studio lighting");
  const [pipeline, setPipeline] = useState<"base" | "fast" | "hd">("base");
  const [modelVersion, setModelVersion] = useState("3.2");
  const [guidanceMethods, setGuidanceMethods] = useState<GuidanceMethod[]>([
    { 
      method: "controlnet_depth", 
      scale: getRecommendedScale("controlnet_depth"), 
      preview: undefined 
    }
  ]);
  const [numResults, setNumResults] = useState(1);
  const [sync, setSync] = useState(false);

  // Job state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<{
    result?: Array<{ urls?: string[]; seed?: number }>;
    image_url?: string;
    [key: string]: unknown;
  } | null>(null);
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
      } catch (err: unknown) {
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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      guidanceMethods.forEach((method) => {
        if (method.preview) {
          revokeImagePreview(method.preview);
        }
      });
    };
  }, []);

  // Add a new ControlNet method
  function addGuidanceMethod() {
    if (guidanceMethods.length >= 2) {
      toast.error("Maximum 2 ControlNet methods allowed");
      return;
    }
    setGuidanceMethods([...guidanceMethods, { method: "controlnet_canny", scale: 0.9 }]);
  }

  // Remove a ControlNet method
  function removeGuidanceMethod(index: number) {
    const newMethods = guidanceMethods.filter((_, i) => i !== index);
    setGuidanceMethods(newMethods);
    
    // Clean up associated file state
    const newFiles = new Map(files);
    const newProgress = new Map(uploadProgress);
    const newKeys = new Map(s3Keys);
    const newUrls = new Map(presignedGetUrls);
    
    newFiles.delete(index);
    newProgress.delete(index);
    newKeys.delete(index);
    newUrls.delete(index);
    
    setFiles(newFiles);
    setUploadProgress(newProgress);
    setS3Keys(newKeys);
    setPresignedGetUrls(newUrls);
  }

  // Update a specific guidance method
  function updateGuidanceMethod(index: number, updates: Partial<GuidanceMethod>) {
    const newMethods = [...guidanceMethods];
    newMethods[index] = { ...newMethods[index], ...updates };
    setGuidanceMethods(newMethods);
  }

  // Handle file selection for a specific ControlNet method
  function handleFileSelect(index: number, file: File | null) {
    const newFiles = new Map(files);
    const newProgress = new Map(uploadProgress);
    
    if (file) {
      // Validate file
      const method = guidanceMethods[index]?.method;
      if (method) {
        const validation = validateGuidanceImage(file, method);
        if (!validation.valid) {
          toast.error(validation.error || "Invalid guidance image");
          return;
        }
      }
      
      // Revoke old preview if exists
      const oldPreview = guidanceMethods[index]?.preview;
      if (oldPreview) {
        revokeImagePreview(oldPreview);
      }
      
      newFiles.set(index, file);
      newProgress.set(index, 0);
      
      // Create preview
      const preview = createImagePreview(file);
      updateGuidanceMethod(index, { preview });
    } else {
      // Revoke preview
      const oldPreview = guidanceMethods[index]?.preview;
      if (oldPreview) {
        revokeImagePreview(oldPreview);
      }
      
      newFiles.delete(index);
      newProgress.delete(index);
      updateGuidanceMethod(index, { preview: undefined });
    }
    
    setFiles(newFiles);
    setUploadProgress(newProgress);
  }

  // Main generation handler
  async function handleGenerate() {
    if (guidanceMethods.length === 0 && !prompt) {
      toast.error("Please provide a prompt or add at least one ControlNet guidance method");
      return;
    }

    // Validate that all guidance methods have images
    for (let i = 0; i < guidanceMethods.length; i++) {
      if (!files.has(i) && !guidanceMethods[i].image_url) {
        toast.error(`ControlNet method ${i + 1} requires an image`);
        return;
      }
    }

    setIsGenerating(true);
    setJobStatus("submitting");
    setJobResult(null);
    setRequestId(null);
    setLogs([]);

    try {
      const guidanceMethodsPayload: GuidanceMethod[] = [];

      // Upload files and prepare guidance methods
      for (let i = 0; i < guidanceMethods.length; i++) {
        const method = guidanceMethods[i];
        let imageUrl: string | undefined;

        // If file provided, upload to S3 first
        const file = files.get(i);
        if (file) {
          log(`Uploading guidance image ${i + 1}...`);
          const { key, presignedPutUrl, presignedGetUrl: getUrl } = await getPresignedUrls(
            file.name,
            file.type
          );
          
          const newKeys = new Map(s3Keys);
          const newUrls = new Map(presignedGetUrls);
          newKeys.set(i, key);
          newUrls.set(i, getUrl);
          setS3Keys(newKeys);
          setPresignedGetUrls(newUrls);

          log(`Uploading file ${i + 1} to S3...`);
          await uploadFileToS3(presignedPutUrl, file, i);
          imageUrl = getUrl;
        } else if (method.image_url) {
          imageUrl = method.image_url;
        }

        if (imageUrl) {
          guidanceMethodsPayload.push({
            method: method.method,
            scale: method.scale,
            image_url: imageUrl,
          });
        }
      }

      // Build request body
      const requestBody: {
        pipeline: "base" | "fast" | "hd";
        model_version: string;
        prompt: string;
        num_results: number;
        sync: boolean;
        guidance_methods?: Array<{
          method: string;
          scale: number;
          image_url?: string;
        }>;
      } = {
        pipeline,
        model_version: modelVersion,
        prompt,
        num_results: numResults,
        sync,
      };

      // Add guidance methods if any
      if (guidanceMethodsPayload.length > 0) {
        requestBody.guidance_methods = guidanceMethodsPayload;
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
    } catch (err: unknown) {
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
              <Select value={pipeline} onValueChange={(v) => setPipeline(v as "base" | "fast" | "hd")}>
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

          {/* ControlNet Guidance Methods */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">ControlNet Guidance Methods</Label>
              {guidanceMethods.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGuidanceMethod}
                >
                  + Add Method
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Use up to 2 ControlNet methods simultaneously for combined control. 
              Depth ControlNet is recommended for lighting-sensitive ProLight AI workflows.
            </p>

            {guidanceMethods.map((method, index) => (
              <Card key={index} className="p-4 border-2">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">ControlNet Method {index + 1}</h4>
                    <p className="text-sm text-muted-foreground">
                      {CONTROLNET_INFO[method.method]?.description}
                    </p>
                  </div>
                  {guidanceMethods.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGuidanceMethod(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Method Selection */}
                  <div className="space-y-2">
                    <Label>Method Type</Label>
                    <Select
                      value={method.method}
                      onValueChange={(v) => updateGuidanceMethod(index, { method: v as "controlnet_canny" | "controlnet_depth" | "controlnet_recoloring" | "controlnet_color_grid" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTROLNET_METHODS).map(([value, info]) => (
                          <SelectItem key={value} value={value}>
                            <div>
                              <div className="font-medium">{info.name}</div>
                              <div className="text-xs text-muted-foreground">{info.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {CONTROLNET_METHODS[method.method]?.bestFor && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <strong>Best for:</strong> {CONTROLNET_METHODS[method.method].bestFor.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Scale Control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Control Strength: {method.scale.toFixed(2)}</Label>
                      <span className="text-xs text-muted-foreground">
                        {getScaleDescription(method.scale)}
                      </span>
                    </div>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={method.scale}
                      onChange={(e) => updateGuidanceMethod(index, { scale: parseFloat(e.target.value) })}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Creative (0.0)</span>
                      <span>Balanced (0.5)</span>
                      <span>Strict (1.0)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const recommended = getRecommendedScale(method.method);
                        updateGuidanceMethod(index, { scale: recommended });
                      }}
                    >
                      Use Recommended ({getRecommendedScale(method.method).toFixed(2)})
                    </Button>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="mt-4 space-y-2">
                  <Label>Guidance Image {index + 1}</Label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          handleFileSelect(index, f || null);
                        }}
                      />
                      {files.get(index) && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {files.get(index)?.name} ({(files.get(index)!.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                      {uploadProgress.get(index) !== undefined && uploadProgress.get(index)! < 100 && (
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between text-sm">
                            <span>Upload Progress</span>
                            <span>{uploadProgress.get(index)}%</span>
                          </div>
                          <Progress value={uploadProgress.get(index)} />
                        </div>
                      )}
                    </div>
                    {method.preview && (
                      <div className="w-32 h-32 border rounded-lg overflow-hidden">
                        <img
                          src={method.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Or provide image URL:
                  </div>
                  <Input
                    type="url"
                    placeholder="https://example.com/guidance-image.png"
                    value={method.image_url || ""}
                    onChange={(e) => updateGuidanceMethod(index, { image_url: e.target.value })}
                  />
                </div>
              </Card>
            ))}
          </div>

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
                    {jobResult.result.map((item, idx: number) => (
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

