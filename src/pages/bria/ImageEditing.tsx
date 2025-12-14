import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Upload, Wand2, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBria } from '@/hooks/useBria';
import { toast } from 'sonner';

const ImageEditing = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [assetId, setAssetId] = useState('');
  const [operation, setOperation] = useState<string>('remove_background');
  const [resultImage, setResultImage] = useState<string | null>(null);

  const { onboardImage, editImage, isLoading } = useBria();

  const operations = [
    { value: 'remove_background', label: 'Remove Background' },
    { value: 'expand', label: 'Expand Image' },
    { value: 'enhance', label: 'Enhance Quality' },
    { value: 'generative_fill', label: 'Generative Fill' },
    { value: 'crop', label: 'Crop' },
    { value: 'mask', label: 'Mask' },
    { value: 'upscale', label: 'Upscale' },
    { value: 'color_correction', label: 'Color Correction' },
    { value: 'noise_reduction', label: 'Noise Reduction' },
  ];

  const handleOnboard = async () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    try {
      const result = await onboardImage(imageUrl);
      if (result.data && typeof result.data === 'object' && 'asset_id' in result.data) {
        const id = (result.data as { asset_id: string }).asset_id;
        setAssetId(id);
        toast.success('Image onboarded successfully!');
      }
    } catch (error) {
      console.error('Onboard error:', error);
    }
  };

  const handleEdit = async () => {
    if (!assetId) {
      toast.error('Please onboard an image first');
      return;
    }

    try {
      const result = await editImage({
        asset_id: assetId,
        operation,
        params: {},
      });

      if (result.request_id) {
        toast.success('Image edit started!');
        // In a real implementation, you would poll for results
      }
    } catch (error) {
      console.error('Edit error:', error);
    }
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
            <Scissors className="w-8 h-8" />
            Image Editing & Transformation
          </h1>
          <p className="text-muted-foreground text-lg">
            Bring your own images and apply advanced edits
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Editor</CardTitle>
              <CardDescription>
                Onboard and edit images with various transformation operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <Button onClick={handleOnboard} disabled={isLoading || !imageUrl.trim()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Onboard
                  </Button>
                </div>
              </div>

              {assetId && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <strong>Asset ID:</strong> <code className="text-xs">{assetId}</code>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="operation">Edit Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger id="operation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleEdit}
                disabled={isLoading || !assetId}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply Edit
                  </>
                )}
              </Button>

              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Available Operations:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Remove Background:</strong> Remove image background</li>
                    <li><strong>Expand:</strong> Expand image boundaries</li>
                    <li><strong>Enhance:</strong> Improve image quality</li>
                    <li><strong>Generative Fill:</strong> Fill areas with AI-generated content</li>
                    <li><strong>Crop:</strong> Crop image to specific dimensions</li>
                    <li><strong>Mask:</strong> Apply masking operations</li>
                    <li><strong>Upscale:</strong> Increase image resolution</li>
                    <li><strong>Color Correction:</strong> Adjust colors</li>
                    <li><strong>Noise Reduction:</strong> Reduce image noise</li>
                  </ul>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Edited image will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultImage ? (
                <img
                  src={resultImage}
                  alt="Edited"
                  className="w-full rounded-lg border"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p>Edited image will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageEditing;
