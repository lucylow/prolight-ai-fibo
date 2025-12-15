import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Lightbulb, Camera, Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateImage, type GenerateResponse } from '@/lib/api';
interface GenerationResult extends GenerateResponse {
  image_url?: string;
  structured_prompt?: Record<string, unknown>;
  meta?: {
    seed?: number;
    [key: string]: unknown;
  };
}

const AgenticWorkflow = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validatePrompt = useCallback((text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) {
      return "Please enter a scene description";
    }
    if (trimmed.length < 10) {
      return "Scene description should be at least 10 characters";
    }
    if (trimmed.length > 1000) {
      return "Scene description should be less than 1000 characters";
    }
    return null;
  }, []);

  const handleGenerate = useCallback(async () => {
    const validationError = validatePrompt(prompt);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const response = await generateImage({
        scene_prompt: prompt.trim(),
        lights: [
          {
            id: 'key',
            position: { x: 1, y: 2, z: 3 },
            intensity: 0.8,
            color_temperature: 5600,
            softness: 0.3,
            enabled: true
          }
        ],
        sync: true,
        num_results: 1,
      });
      
      if (response.ok && response.image_url) {
        setResult(response as GenerationResult);
        toast({
          title: "Success!",
          description: "Image generated successfully",
        });
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to generate image. Please try again.";
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  }, [prompt, validatePrompt, toast]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Agentic Workflow
        </h1>
        <p className="text-muted-foreground text-lg">
          AI-powered lighting generation with FIBO's deterministic control
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Scene Description
            </CardTitle>
            <CardDescription>
              Describe your scene and let AI generate optimal lighting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="e.g., a vintage watch on a wooden table with dramatic lighting"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setError(null);
                }}
                rows={6}
                className="resize-none"
                disabled={loading}
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground text-right">
                {prompt.length}/1000 characters
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Workflow Steps:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">1</Badge>
                  <span className="text-muted-foreground">VLM analyzes scene description</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">2</Badge>
                  <span className="text-muted-foreground">Lighting mapper converts 3D positions to FIBO directions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">3</Badge>
                  <span className="text-muted-foreground">FIBO generates image with structured JSON</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate with FIBO
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Generated Result
            </CardTitle>
            <CardDescription>
              AI-generated image with deterministic lighting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing with FIBO...</p>
              </div>
            )}

            {!loading && !result && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Camera className="h-16 w-16 mb-4 opacity-20" />
                <p>Your generated image will appear here</p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-4">
                {result.image_url && (
                  <div className="relative rounded-lg overflow-hidden border group">
                    <img 
                      src={result.image_url} 
                      alt="Generated scene" 
                      className="w-full h-auto transition-opacity"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        setError('Failed to load generated image');
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  </div>
                )}

                {result.structured_prompt && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Structured Prompt:</p>
                    <div className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(result.structured_prompt, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {result.meta && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <Badge variant="secondary" className="capitalize">
                      {result.status || 'completed'}
                    </Badge>
                    {result.meta.seed && (
                      <Badge variant="outline">
                        Seed: {String(result.meta.seed)}
                      </Badge>
                    )}
                    {result.request_id && (
                      <Badge variant="outline" className="font-mono text-xs">
                        ID: {result.request_id.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">JSON-Native</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Structured prompts ensure deterministic, reproducible results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lighting Mapper</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              3D vector positions converted to FIBO direction strings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pro Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Intensity, color temperature, softness, and direction control
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgenticWorkflow;
