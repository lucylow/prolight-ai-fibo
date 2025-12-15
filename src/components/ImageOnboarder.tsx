/**
 * ImageOnboarder Component
 * 
 * React component for Bria Image Onboarding API integration.
 * Supports registering images by URL, org_image_key, or file upload (S3).
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import api from '@/api/axios';

interface VisualMapping {
  id: number;
  visual_id: string;
  source: string;
  image_url: string | null;
  org_image_key: string | null;
  s3_key: string | null;
  is_private: boolean;
  created_at: string;
  expire_at: string | null;
  removed: boolean;
}

export default function ImageOnboarder() {
  const [mode, setMode] = useState<'url' | 'org' | 'file'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [orgKey, setOrgKey] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [expireHours, setExpireHours] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [visualId, setVisualId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<VisualMapping[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  useEffect(() => {
    // Preview image URL when it changes
    if (mode === 'url' && imageUrl) {
      setImagePreview(imageUrl);
    } else if (mode === 'file' && file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }, [mode, imageUrl, file]);

  async function fetchMappings() {
    try {
      const res = await api.get('/image/list', { params: { removed: false } });
      setMappings(res.data || []);
    } catch (err: unknown) {
      console.warn('Could not fetch mappings', err);
      toast.error('Failed to load registered images');
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVisualId(null);
    setLoading(true);

    try {
      if (mode === 'url') {
        if (!imageUrl) throw new Error('Please provide an image URL');
        const payload: {
          image_url: string;
          is_private: boolean;
          expire_hours?: number;
        } = {
          image_url: imageUrl,
          is_private: isPrivate,
        };
        if (expireHours) {
          payload.expire_hours = parseInt(expireHours);
        }
        const resp = await api.post('/image/register', payload);
        setVisualId(resp.data.visual_id);
        toast.success(`Image registered! Visual ID: ${resp.data.visual_id}`);
      } else if (mode === 'org') {
        if (!orgKey) throw new Error('Please provide org_image_key');
        const payload: {
          org_image_key: string;
          is_private: boolean;
          expire_hours?: number;
        } = {
          org_image_key: orgKey,
          is_private: isPrivate,
        };
        if (expireHours) {
          payload.expire_hours = parseInt(expireHours);
        }
        const resp = await api.post('/image/register', payload);
        setVisualId(resp.data.visual_id);
        toast.success(`Image registered! Visual ID: ${resp.data.visual_id}`);
      } else if (mode === 'file') {
        if (!file) throw new Error('Please select a file');
        
        // Step 1: Get presigned URL from backend
        const presignResp = await api.post('/s3/presign-image', {
          filename: file.name,
          content_type: file.type || 'image/jpeg',
          make_public: true, // Make public so Bria can access it
        });

        // Step 2: Upload file to S3 using presigned URL
        await fetch(presignResp.data.upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'image/jpeg',
          },
        });

        // Step 3: Register S3 URL with Bria
        const payload: {
          image_url: string;
          is_private: boolean;
          expire_hours?: number;
        } = {
          image_url: presignResp.data.public_url,
          is_private: isPrivate,
        };
        if (expireHours) {
          payload.expire_hours = parseInt(expireHours);
        }
        const resp = await api.post('/image/register-s3-url', payload);
        setVisualId(resp.data.visual_id);
        toast.success(`Image uploaded and registered! Visual ID: ${resp.data.visual_id}`);
      }
      
      await fetchMappings();
      
      // Reset form
      setImageUrl('');
      setOrgKey('');
      setFile(null);
      setExpireHours('');
    } catch (err: unknown) {
      console.error('Register error', err);
      const errorMsg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail || 
                      (err as { message?: string })?.message || 
                      'Registration failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function onRemove(visual_id: string) {
    if (!confirm(`Remove visual ${visual_id} from your organization gallery?`)) return;
    
    try {
      await api.post('/image/remove', { visual_id });
      await fetchMappings();
      if (visualId === visual_id) setVisualId(null);
      toast.success('Image removed from gallery');
    } catch (err: unknown) {
      console.error('Remove error', err);
      const errorMsg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail || 
                      (err as { message?: string })?.message || 
                      'Remove failed';
      toast.error(errorMsg);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>ProLight — Image Onboarding</CardTitle>
          <CardDescription>
            Register images with Bria to get visual_id for AI Search and Image Editing.
            Images can be registered by URL, internal key, or file upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url">By URL</TabsTrigger>
              <TabsTrigger value="org">By org_image_key</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>

            <form onSubmit={onRegister} className="mt-6 space-y-4">
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-url">Public Image URL</Label>
                  <Input
                    id="image-url"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    URL must be publicly accessible by Bria
                  </p>
                </div>
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg border"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="org" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-key">Your org_image_key</Label>
                  <Input
                    id="org-key"
                    value={orgKey}
                    onChange={(e) => setOrgKey(e.target.value)}
                    placeholder="internal-image-id-123"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Internal image ID from your system. If protected, you must provide Bria credentials.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Upload image file</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    PNG or JPEG, max 12MB. File will be uploaded to S3 and registered with Bria.
                  </p>
                </div>
                {file && (
                  <div className="mt-2 text-sm">
                    <strong>Selected:</strong> {file.name} — {(file.size / 1024).toFixed(1)} KB
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg border"
                    />
                  </div>
                )}
              </TabsContent>

              <div className="flex items-center space-x-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-private"
                    checked={isPrivate}
                    onCheckedChange={(checked) => setIsPrivate(checked === true)}
                  />
                  <Label htmlFor="is-private" className="cursor-pointer">
                    Private to organization
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="expire-hours">Expire in (hours):</Label>
                  <Input
                    id="expire-hours"
                    type="number"
                    value={expireHours}
                    onChange={(e) => setExpireHours(e.target.value)}
                    placeholder="Optional"
                    className="w-24"
                    min="1"
                  />
                </div>

                <Button type="submit" disabled={loading} className="ml-auto">
                  {loading ? 'Registering…' : 'Register Image'}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {visualId && (
                <Alert variant="default">
                  <AlertDescription>
                    Registered visual_id: <code className="bg-muted px-2 py-1 rounded">{visualId}</code>
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registered Visuals</CardTitle>
          <CardDescription>
            Images registered with Bria Image Onboarding API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-muted-foreground">No visuals registered yet.</p>
          ) : (
            <div className="space-y-4">
              {mappings.map((m) => (
                <Card key={m.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{m.source}</Badge>
                          {m.is_private && <Badge variant="secondary">Private</Badge>}
                        </div>
                        <div>
                          <strong>visual_id:</strong>{' '}
                          <code className="bg-muted px-2 py-1 rounded text-sm">{m.visual_id}</code>
                        </div>
                        {m.image_url && (
                          <div className="text-sm">
                            <strong>image_url:</strong>{' '}
                            <span className="text-muted-foreground break-all">{m.image_url}</span>
                          </div>
                        )}
                        {m.org_image_key && (
                          <div className="text-sm">
                            <strong>org_image_key:</strong>{' '}
                            <span className="text-muted-foreground">{m.org_image_key}</span>
                          </div>
                        )}
                        {m.s3_key && (
                          <div className="text-sm">
                            <strong>s3_key:</strong>{' '}
                            <span className="text-muted-foreground">{m.s3_key}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(m.created_at).toLocaleString()}
                        </div>
                        {m.expire_at && (
                          <div className="text-xs text-muted-foreground">
                            Expires: {new Date(m.expire_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        {m.image_url && (
                          <img
                            src={m.image_url}
                            alt="Thumbnail"
                            className="max-h-24 rounded border"
                          />
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onRemove(m.visual_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

