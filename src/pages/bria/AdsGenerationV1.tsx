import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Download,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  generateAdsV1, 
  checkAdsStatus, 
  downloadAdsImage,
  type AdsSceneResult 
} from '@/api/bria';
import { toast } from 'sonner';

interface SceneState extends AdsSceneResult {
  status: 'pending' | 'ready' | 'failed' | 'timeout';
  contentLength: number | null;
  imageSrc: string | null;
  attempts: number;
}

const AdsGenerationV1 = () => {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<SceneState[]>([]);
  const cancelRef = useRef(false);

  // Form state
  const [templateId, setTemplateId] = useState('1062'); // Public template
  const [brandId, setBrandId] = useState('167'); // Public brand
  const [smartImageUrl, setSmartImageUrl] = useState('https://images.unsplash.com/photo-1518544882205-450b760f8b7a');
  const [smartImageOperation, setSmartImageOperation] = useState<'expand_image' | 'lifestyle_shot_by_text'>('lifestyle_shot_by_text');
  const [smartImagePrompt, setSmartImagePrompt] = useState('Outdoor lifestyle background, shallow depth of field, warm late-afternoon light');
  const [headingText, setHeadingText] = useState('ProLight — Precision Lighting');
  const [bodyText, setBodyText] = useState('Control lighting for product photography — simulate key/fill/rim');
  const [contentModeration, setContentModeration] = useState(false);

  // Polling config
  const MAX_POLL_ATTEMPTS = 60;
  const INITIAL_POLL_INTERVAL = 2000;
  const POLL_BACKOFF_MULT = 1.5;

  const buildPayload = () => ({
    template_id: templateId,
    brand_id: brandId || undefined,
    content_moderation: contentModeration,
    smart_image: smartImageUrl ? {
      input_image_url: smartImageUrl,
      scene: {
        operation: smartImageOperation,
        input: smartImageOperation === 'lifestyle_shot_by_text' ? smartImagePrompt : '#FFFFFF',
      },
    } : undefined,
    elements: [
      {
        layer_type: 'text' as const,
        content_type: 'Heading #1',
        content: headingText,
      },
      {
        layer_type: 'text' as const,
        content_type: 'Body #1',
        content: bodyText,
      },
    ],
  });

  async function submitGenerate() {
    setLoading(true);
    cancelRef.current = false;
    setScenes([]);

    if (!templateId.trim()) {
      toast.error('Template ID is required');
      setLoading(false);
      return;
    }

    try {
      const payload = buildPayload();
      const resp = await generateAdsV1(payload);
      const result = resp.result || [];

      if (result.length === 0) {
        toast.error('No scenes returned from API');
        setLoading(false);
        return;
      }

      const sceneObjs: SceneState[] = result.map(r => ({
        ...r,
        status: 'pending' as const,
        contentLength: null,
        imageSrc: null,
        attempts: 0,
      }));

      setScenes(sceneObjs);
      toast.success(`Generation started! ${result.length} scene(s) queued.`);

      // Start polling for each scene (non-blocking)
      sceneObjs.forEach(scene => pollScene(scene));
    } catch (err: unknown) {
      console.error('generate error', err);
      const errorMsg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 
                      (err as { message?: string })?.message || 
                      'Failed to submit generation';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  // Poll a single scene until ready/failed/timeout
  async function pollScene(scene: SceneState) {
    let attempt = 0;
    let interval = INITIAL_POLL_INTERVAL;

    while (!cancelRef.current && attempt < MAX_POLL_ATTEMPTS) {
      attempt++;
      
      try {
        // Update attempt count in UI
        setScenes(prev => prev.map(s => 
          s.id === scene.id ? { ...s, attempts: attempt } : s
        ));

        const statusResp = await checkAdsStatus(scene.url);
        const { status, contentLength } = statusResp;

        if (status === 'ready') {
          // Download proxied bytes to a blob URL
          try {
            const blob = await downloadAdsImage(scene.url);
            const objectUrl = URL.createObjectURL(blob);

            setScenes(prev => prev.map(s => 
              s.id === scene.id ? {
                ...s,
                status: 'ready',
                contentLength: contentLength ?? null,
                imageSrc: objectUrl,
              } : s
            ));
            toast.success(`Scene "${scene.name}" is ready!`);
          } catch (err) {
            console.error('download error', err);
            setScenes(prev => prev.map(s => 
              s.id === scene.id ? { ...s, status: 'failed' } : s
            ));
            toast.error(`Failed to download scene "${scene.name}"`);
          }
          return;
        } else if (status === 'failed') {
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { 
              ...s, 
              status: 'failed', 
              contentLength: contentLength 
            } : s
          ));
          toast.error(`Scene "${scene.name}" generation failed`);
          return;
        } else {
          // pending — continue polling
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { 
              ...s, 
              status: 'pending', 
              contentLength: contentLength 
            } : s
          ));
        }
      } catch (err) {
        console.warn('poll error', err);
        // Continue; perhaps server returned 500, treat as pending
      }

      // Exponential backoff
      await new Promise(r => setTimeout(r, interval));
      interval = Math.min(60000, Math.round(interval * POLL_BACKOFF_MULT));
    }

    // Timeout
    if (!cancelRef.current) {
      setScenes(prev => prev.map(s => 
        s.id === scene.id ? { ...s, status: 'timeout' } : s
      ));
      toast.warning(`Scene "${scene.name}" polling timed out`);
    }
  }

  // Cancel ongoing polling if component unmounts
  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const getStatusIcon = (status: SceneState['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusBadge = (status: SceneState['status']) => {
    const variants: Record<SceneState['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      ready: { label: 'Ready', variant: 'default' },
      failed: { label: 'Failed', variant: 'destructive' },
      timeout: { label: 'Timeout', variant: 'outline' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Megaphone className="w-8 h-8" />
            Ads Generation (v1 API)
          </h1>
          <p className="text-muted-foreground text-lg">
            Create multiple ad scenes with templates, brands, and smart image backgrounds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Configure your ad generation using Bria's v1 Ads API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateId">Template ID *</Label>
                  <Input
                    id="templateId"
                    placeholder="1062"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Public: 1062, 1061
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand ID</Label>
                  <Input
                    id="brandId"
                    placeholder="167"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Public: 167, 166, 122, 121, 120
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="smartImageUrl">Smart Image URL</Label>
                <Input
                  id="smartImageUrl"
                  placeholder="https://..."
                  value={smartImageUrl}
                  onChange={(e) => setSmartImageUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Product/presenter image to embed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smartImageOperation">Smart Image Operation</Label>
                <Select
                  value={smartImageOperation}
                  onValueChange={(v: 'expand_image' | 'lifestyle_shot_by_text') => 
                    setSmartImageOperation(v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifestyle_shot_by_text">Lifestyle Shot by Text</SelectItem>
                    <SelectItem value="expand_image">Expand Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {smartImageOperation === 'lifestyle_shot_by_text' && (
                <div className="space-y-2">
                  <Label htmlFor="smartImagePrompt">Background Prompt</Label>
                  <Textarea
                    id="smartImagePrompt"
                    placeholder="Outdoor lifestyle background..."
                    value={smartImagePrompt}
                    onChange={(e) => setSmartImagePrompt(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="headingText">Heading Text</Label>
                <Input
                  id="headingText"
                  placeholder="ProLight — Precision Lighting"
                  value={headingText}
                  onChange={(e) => setHeadingText(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyText">Body Text</Label>
                <Textarea
                  id="bodyText"
                  placeholder="Control lighting for product photography..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="contentModeration">Content Moderation</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to filter inappropriate content
                  </p>
                </div>
                <Switch
                  id="contentModeration"
                  checked={contentModeration}
                  onCheckedChange={setContentModeration}
                />
              </div>

              <Button
                onClick={submitGenerate}
                disabled={loading || !templateId.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4 mr-2" />
                    Generate Ads
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Scenes</CardTitle>
              <CardDescription>
                {scenes.length > 0 
                  ? `${scenes.length} scene(s) — ${scenes.filter(s => s.status === 'ready').length} ready`
                  : 'No scenes yet — submit generate to start'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p>Generated scenes will appear here</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {scenes.map(scene => (
                    <Card key={scene.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(scene.status)}
                            <div>
                              <div className="font-semibold">{scene.name || scene.id}</div>
                              {scene.resolution && (
                                <div className="text-xs text-muted-foreground">
                                  {scene.resolution.width} × {scene.resolution.height}
                                </div>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(scene.status)}
                        </div>

                        {scene.status === 'pending' && (
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Polling... (attempt {scene.attempts}/{MAX_POLL_ATTEMPTS})</span>
                              {scene.contentLength !== null && (
                                <span>{scene.contentLength} bytes</span>
                              )}
                            </div>
                            <Progress 
                              value={(scene.attempts / MAX_POLL_ATTEMPTS) * 100} 
                              className="h-1"
                            />
                          </div>
                        )}

                        <div className="min-h-[200px] flex items-center justify-center bg-muted rounded-lg mb-3 overflow-hidden">
                          {scene.imageSrc ? (
                            <img 
                              src={scene.imageSrc} 
                              alt={scene.name} 
                              className="max-w-full max-h-[200px] object-contain rounded"
                            />
                          ) : (
                            <div className="text-center text-muted-foreground p-4">
                              {scene.status === 'pending' && (
                                <>
                                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                  <p className="text-sm">Waiting for generated image...</p>
                                </>
                              )}
                              {scene.status === 'failed' && (
                                <>
                                  <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                                  <p className="text-sm">Generation failed (zero-byte placeholder)</p>
                                </>
                              )}
                              {scene.status === 'timeout' && (
                                <>
                                  <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                                  <p className="text-sm">Timed out — try again later</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1"
                          >
                            <a 
                              href={scene.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open URL
                            </a>
                          </Button>
                          {scene.imageSrc && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="flex-1"
                            >
                              <a 
                                href={scene.imageSrc} 
                                download={`${scene.name || scene.id}.png`}
                                className="flex items-center justify-center gap-2"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default AdsGenerationV1;
