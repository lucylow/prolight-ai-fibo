import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Upload, Wand2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBria } from '@/hooks/useBria';
import { toast } from 'sonner';

const ProductImagery = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [assetId, setAssetId] = useState('');
  const [operation, setOperation] = useState<'isolate' | 'add_shadow' | 'packshot' | 'replace_background' | 'enhance_product'>('isolate');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);

  const { onboardImage, productShotEdit, isLoading } = useBria();

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

    const params: Record<string, unknown> = {};
    if (operation === 'replace_background' && backgroundUrl) {
      params.background_url = backgroundUrl;
    }

    try {
      const result = await productShotEdit({
        asset_id: assetId,
        operation,
        params,
      });

      if (result.request_id) {
        toast.success('Product shot edit started!');
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
            <Package className="w-8 h-8" />
            Product Imagery Editing
          </h1>
          <p className="text-muted-foreground text-lg">
            Create professional packshots, lifestyle images, and product variations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Image Editor</CardTitle>
              <CardDescription>
                Onboard and edit product images with specialized operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Product Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/product.jpg"
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
                <Label htmlFor="operation">Operation</Label>
                <Select
                  value={operation}
                  onValueChange={(v) => setOperation(v as typeof operation)}
                >
                  <SelectTrigger id="operation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="isolate">Isolate Product</SelectItem>
                    <SelectItem value="add_shadow">Add Shadow</SelectItem>
                    <SelectItem value="packshot">Create Packshot</SelectItem>
                    <SelectItem value="replace_background">Replace Background</SelectItem>
                    <SelectItem value="enhance_product">Enhance Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {operation === 'replace_background' && (
                <div className="space-y-2">
                  <Label htmlFor="backgroundUrl">Background Image URL</Label>
                  <Input
                    id="backgroundUrl"
                    placeholder="https://example.com/background.jpg"
                    value={backgroundUrl}
                    onChange={(e) => setBackgroundUrl(e.target.value)}
                  />
                </div>
              )}

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
                    <li><strong>Isolate:</strong> Remove background and isolate product</li>
                    <li><strong>Add Shadow:</strong> Add realistic shadow to product</li>
                    <li><strong>Packshot:</strong> Create professional packshot</li>
                    <li><strong>Replace Background:</strong> Replace with new background</li>
                    <li><strong>Enhance:</strong> Enhance product quality and details</li>
                  </ul>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Edited product image will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultImage ? (
                <img
                  src={resultImage}
                  alt="Edited product"
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

export default ProductImagery;

