import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Lightbulb, Camera, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateImage } from '@/lib/api';

const AgenticWorkflow = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a scene description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await generateImage({
        scene_prompt: prompt,
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
        sync: true
      });
      
      if (data.ok) {
        setResult(data);
        toast({
          title: "Success!",
          description: "Image generated successfully",
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <Textarea
              placeholder="e.g., a vintage watch on a wooden table with dramatic lighting"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="resize-none"
            />
            
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

            {result && (
              <div className="space-y-4">
                {result.image_url && (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img 
                      src={result.image_url} 
                      alt="Generated" 
                      className="w-full h-auto"
                    />
                  </div>
                )}

                {result.structured_prompt && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Structured Prompt:</p>
                    <div className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(result.structured_prompt, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {result.meta && (
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      Status: {result.status}
                    </Badge>
                    {result.meta.seed && (
                      <Badge variant="outline">
                        Seed: {result.meta.seed}
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

