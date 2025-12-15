import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { PromptInput } from "@/components/Generator/PromptInput";
import { FiboEditor } from "@/components/Generator/FiboEditor";
import { GuidanceUploader } from "@/components/Generator/GuidanceUploader";
import { ControlNetPanel } from "@/components/Generator/ControlNetPanel";
import { SeedAndModel } from "@/components/Generator/SeedAndModel";
import { CostEstimator } from "@/components/Generator/CostEstimator";
import { CacheBadge } from "@/components/Generator/CacheBadge";
import { LiveSSEPanel } from "@/components/Generator/LiveSSEPanel";
import { VariantGrid } from "@/components/Generator/VariantGrid";
import {
  createTextToImageJob,
  getGenerationStatus,
  type TextToImageRequest,
  type ArtifactInfo,
  type GuidanceImage,
  type ControlNetConfig,
} from "@/api/text-to-image";

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [fiboJson, setFiboJson] = useState<Record<string, unknown> | undefined>();
  const [modelVersion, setModelVersion] = useState("bria-fibo-v1");
  const [seed, setSeed] = useState<number | undefined>();
  const [guidanceImages, setGuidanceImages] = useState<GuidanceImage[]>([]);
  const [controlnet, setControlnet] = useState<ControlNetConfig | null>(null);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [numVariants, setNumVariants] = useState(1);
  const [refineMode, setRefineMode] = useState<"generate" | "refine" | "inspire">("generate");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [sseToken, setSseToken] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [primaryArtifactId, setPrimaryArtifactId] = useState<string | undefined>();
  const [cachedHit, setCachedHit] = useState(false);
  const [cachedArtifactId, setCachedArtifactId] = useState<string | undefined>();

  const handleGenerate = async () => {
    if (!prompt && !fiboJson) {
      toast.error("Please enter a prompt or FIBO JSON");
      return;
    }

    setIsGenerating(true);
    setRunId(null);
    setArtifacts([]);
    setCachedHit(false);

    try {
      const request: TextToImageRequest = {
        prompt: prompt || undefined,
        fibo_json: fiboJson,
        model: modelVersion,
        seed,
        guidance_images: guidanceImages.length > 0 ? guidanceImages : undefined,
        controlnet: controlnet || undefined,
        width,
        height,
        num_variants: numVariants,
        refine_mode: refineMode,
      };

      const response = await createTextToImageJob(request);
      
      setRunId(response.run_id);
      setSseToken(response.sse_token);
      setSeed(response.seed); // Use the seed returned by backend
      setCachedHit(response.cached_hit || false);
      
      if (response.cached_hit && response.cached_artifact_id) {
        setCachedArtifactId(response.cached_artifact_id);
        toast.success("Cache hit! Returning cached result.");
        // Fetch the cached artifact
        const status = await getGenerationStatus(response.run_id);
        setArtifacts(status.artifacts);
      } else {
        toast.success("Generation started!");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
      toast.error(errorMessage);
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSSEArtifacts = (newArtifacts: ArtifactInfo[]) => {
    setArtifacts((prev) => {
      const combined = [...prev];
      newArtifacts.forEach((newArt) => {
        const existingIndex = combined.findIndex((a) => a.id === newArt.id);
        if (existingIndex >= 0) {
          combined[existingIndex] = newArt;
        } else {
          combined.push(newArt);
        }
      });
      return combined;
    });
  };

  const handleSSEComplete = async (status: string) => {
    if (status === "completed" && runId) {
      // Fetch final status to get all artifacts
      try {
        const statusResponse = await getGenerationStatus(runId);
        setArtifacts(statusResponse.artifacts);
        if (statusResponse.artifacts.length > 0 && !primaryArtifactId) {
          // Auto-select highest scoring artifact as primary
          const sorted = [...statusResponse.artifacts].sort(
            (a, b) => (b.evaluator_score || 0) - (a.evaluator_score || 0)
          );
          setPrimaryArtifactId(sorted[0].id);
        }
      } catch (error) {
        console.error("Error fetching final status:", error);
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Text → Image Generation</h1>
        <p className="text-muted-foreground">
          Generate images with deterministic control, caching, and variant management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="prompt" className="w-full">
            <TabsList>
              <TabsTrigger value="prompt">Text Prompt</TabsTrigger>
              <TabsTrigger value="fibo">FIBO JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="space-y-4">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                showStats={true}
              />
            </TabsContent>

            <TabsContent value="fibo" className="space-y-4">
              <FiboEditor value={fiboJson} onChange={setFiboJson} />
            </TabsContent>
          </Tabs>

          <SeedAndModel
            seed={seed}
            onSeedChange={setSeed}
            modelVersion={modelVersion}
            onModelChange={setModelVersion}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 1024)}
                min={256}
                max={4096}
                step={64}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 1024)}
                min={256}
                max={4096}
                step={64}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="variants">Number of Variants</Label>
              <Input
                id="variants"
                type="number"
                value={numVariants}
                onChange={(e) => setNumVariants(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refine">Refine Mode</Label>
              <Select value={refineMode} onValueChange={(v: "generate" | "refine" | "inspire") => setRefineMode(v)}>
                <SelectTrigger id="refine">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generate">Generate</SelectItem>
                  <SelectItem value="refine">Refine</SelectItem>
                  <SelectItem value="inspire">Inspire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <GuidanceUploader
            images={guidanceImages}
            onChange={setGuidanceImages}
            maxImages={5}
          />

          <ControlNetPanel value={controlnet} onChange={setControlnet} />

          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt && !fiboJson)}
              size="lg"
              className="flex-1"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cachedHit && <Sparkles className="mr-2 h-4 w-4" />}
              {cachedHit ? "Use Cached Result" : "Generate Images"}
            </Button>
            {cachedHit && <CacheBadge cached={true} />}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <CostEstimator
            numVariants={numVariants}
            width={width}
            height={height}
            hasControlNet={!!controlnet}
            numGuidanceImages={guidanceImages.length}
            modelVersion={modelVersion}
          />

          {runId && sseToken && (
            <LiveSSEPanel
              runId={runId}
              sseToken={sseToken}
              onArtifacts={handleSSEArtifacts}
              onComplete={handleSSEComplete}
            />
          )}
        </div>
      </div>

      {/* Results */}
      {artifacts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Generated Variants</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Auto-select top variant
                  const sorted = [...artifacts].sort(
                    (a, b) => (b.evaluator_score || 0) - (a.evaluator_score || 0)
                  );
                  if (sorted.length > 0) {
                    setPrimaryArtifactId(sorted[0].id);
                  }
                }}
              >
                Auto-select Best
              </Button>
            </div>
          </div>
          <VariantGrid
            artifacts={artifacts}
            primaryId={primaryArtifactId}
            onSelectPrimary={setPrimaryArtifactId}
            showScores={true}
          />
        </div>
      )}
    </div>
  );
}

