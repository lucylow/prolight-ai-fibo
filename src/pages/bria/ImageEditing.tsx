import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Upload, Wand2, Scissors, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBriaImageEditing } from '@/hooks/useBriaImageEditing';
import { toast } from 'sonner';

const ImageEditing = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState('');
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [operation, setOperation] = useState<string>('remove_background');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; operation: string; timestamp: number }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  const {
    erase,
    generativeFill,
    removeBackground,
    replaceBackground,
    expand,
    enhance,
    blurBackground,
    eraseForeground,
    cropForeground,
    increaseResolution,
    generateMasks,
    completeLightingEnhancement,
    isLoading,
    error,
  } = useBriaImageEditing();

  const operations = [
    { value: 'remove_background', label: 'Remove Background', needsMask: false, needsPrompt: false },
    { value: 'replace_background', label: 'Replace Background', needsMask: false, needsPrompt: true },
    { value: 'erase', label: 'Erase Region', needsMask: true, needsPrompt: false },
    { value: 'gen_fill', label: 'Generative Fill', needsMask: true, needsPrompt: true },
    { value: 'blur_background', label: 'Blur Background', needsMask: false, needsPrompt: false },
    { value: 'erase_foreground', label: 'Erase Foreground', needsMask: false, needsPrompt: false },
    { value: 'expand', label: 'Expand Canvas', needsMask: false, needsPrompt: false },
    { value: 'enhance', label: 'Enhance Quality', needsMask: false, needsPrompt: false },
    { value: 'crop_foreground', label: 'Crop Foreground', needsMask: false, needsPrompt: false },
    { value: 'increase_resolution', label: 'Increase Resolution', needsMask: false, needsPrompt: false },
    { value: 'generate_masks', label: 'Generate Masks', needsMask: false, needsPrompt: false },
  ];

  const selectedOperation = operations.find(op => op.value === operation);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
      setImageUrl(base64);
    }
  };

  const handleMaskUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMaskFile(file);
      const base64 = await fileToBase64(file);
      setMaskPreview(base64);
      setMaskUrl(base64);
    }
  };

  const getImageInput = () => {
    if (imageFile) {
      return imageUrl; // base64
    }
    return imageUrl; // URL or base64
  };

  const getMaskInput = () => {
    if (maskFile) {
      return maskUrl; // base64
    }
    return maskUrl || undefined; // URL or base64
  };

  const handleEdit = async () => {
    const imageInput = getImageInput();
    if (!imageInput) {
      toast.error('Please upload an image or enter an image URL');
      return;
    }

    try {
      let response;

      switch (operation) {
        case 'remove_background':
          response = await removeBackground({
            image: imageInput,
            sync: true,
          });
          break;

        case 'replace_background':
          if (!prompt.trim()) {
            toast.error('Please enter a background prompt');
            return;
          }
          response = await replaceBackground({
            image: imageInput,
            prompt,
            negativePrompt: negativePrompt || undefined,
            mode: 'high_control',
            sync: true,
          });
          break;

        case 'erase':
          if (!maskUrl) {
            toast.error('Please upload a mask');
            return;
          }
          response = await erase({
            image: imageInput,
            mask: getMaskInput()!,
            sync: true,
          });
          break;

        case 'gen_fill':
          if (!maskUrl) {
            toast.error('Please upload a mask');
            return;
          }
          if (!prompt.trim()) {
            toast.error('Please enter a prompt');
            return;
          }
          response = await generativeFill({
            image: imageInput,
            mask: getMaskInput()!,
            prompt,
            negativePrompt: negativePrompt || undefined,
            version: 2,
            sync: true,
          });
          break;

        case 'blur_background':
          response = await blurBackground({
            image: imageInput,
            scale: 5,
            sync: true,
          });
          break;

        case 'erase_foreground':
          response = await eraseForeground({
            image: imageInput,
            sync: true,
          });
          break;

        case 'expand':
          response = await expand({
            image: imageInput,
            prompt: prompt || 'Professional studio background with neutral lighting',
            aspectRatio: '16:9',
            sync: true,
          });
          break;

        case 'enhance':
          response = await enhance({
            image: imageInput,
            resolution: '2MP',
            sync: true,
          });
          break;

        case 'crop_foreground':
          response = await cropForeground({
            image: imageInput,
            padding: 0,
            sync: true,
          });
          break;

        case 'increase_resolution':
          response = await increaseResolution({
            image: imageInput,
            desiredIncrease: 2,
            sync: true,
          });
          break;

        case 'generate_masks':
          response = await generateMasks({
            image: imageInput,
            sync: true,
          });
          break;

        default:
          toast.error('Unknown operation');
          return;
      }

      const resultUrl = response.result?.image_url;
      if (resultUrl) {
        setResultImage(resultUrl);
        setHistory(prev => [
          ...prev,
          {
            url: resultUrl,
            operation: selectedOperation?.label || operation,
            timestamp: Date.now(),
          },
        ]);
        toast.success('Image edited successfully!');
      } else {
        toast.info('Processing started. Check status for results.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
      console.error('Edit error:', err);
    }
  };

  const handleCompleteWorkflow = async () => {
    const imageInput = getImageInput();
    if (!imageInput) {
      toast.error('Please upload an image or enter an image URL');
      return;
    }

    try {
      const result = await completeLightingEnhancement(imageInput, {
        removeBackground: true,
        replaceBackground: true,
        enhance: true,
        expandCanvas: true,
        backgroundPrompt: prompt || 'Professional studio lighting with warm key light, soft fill light, and dramatic rim lighting',
        expandAspectRatio: '16:9',
      });

      if (result.finalUrl) {
        setResultImage(result.finalUrl);
        setHistory(prev => [
          ...prev,
          {
            url: result.finalUrl,
            operation: 'Complete Lighting Enhancement',
            timestamp: Date.now(),
          },
        ]);
        toast.success('Complete workflow finished successfully!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
      console.error('Workflow error:', err);
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
            BRIA Image Editing API v2
          </h1>
          <p className="text-muted-foreground text-lg">
            Professional image editing with AI-powered transformations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Editor</CardTitle>
              <CardDescription>
                Upload images and apply advanced AI-powered edits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image"
                  />
                  <Input
                    placeholder="Or enter image URL or base64"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-48 object-contain rounded-lg border"
                  />
                )}
              </div>

              {/* Operation Selection */}
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

              {/* Mask Upload (for operations that need it) */}
              {selectedOperation?.needsMask && (
                <div className="space-y-2">
                  <Label htmlFor="mask">Mask (Required)</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={maskInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleMaskUpload}
                      className="hidden"
                      id="mask"
                    />
                    <Input
                      placeholder="Or enter mask URL or base64"
                      value={maskUrl}
                      onChange={(e) => setMaskUrl(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => maskInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Mask
                    </Button>
                  </div>
                  {maskPreview && (
                    <img
                      src={maskPreview}
                      alt="Mask Preview"
                      className="w-full max-h-48 object-contain rounded-lg border"
                    />
                  )}
                </div>
              )}

              {/* Prompt Input (for operations that need it) */}
              {selectedOperation?.needsPrompt && (
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt {selectedOperation.needsPrompt ? '(Required)' : '(Optional)'}</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Optional Prompt Input */}
              {['gen_fill', 'replace_background'].includes(operation) && (
                <div className="space-y-2">
                  <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                  <Textarea
                    id="negativePrompt"
                    placeholder="What to avoid in the generation..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleEdit}
                  disabled={isLoading || !imageUrl}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Apply Operation
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCompleteWorkflow}
                  disabled={isLoading || !imageUrl}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Complete Lighting Workflow
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error.message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Edited image will appear here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultImage ? (
                <>
                  <img
                    src={resultImage}
                    alt="Edited"
                    className="w-full rounded-lg border"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultImage;
                        link.download = `edited-${Date.now()}.png`;
                        link.click();
                      }}
                    >
                      Download
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p>Edited image will appear here</p>
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2">History</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {history.slice(-4).reverse().map((item, idx) => (
                      <div
                        key={idx}
                        className="relative cursor-pointer group"
                        onClick={() => setResultImage(item.url)}
                      >
                        <img
                          src={item.url}
                          alt={item.operation}
                          className="w-full rounded border opacity-75 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                          {item.operation}
                        </div>
                      </div>
                    ))}
                  </div>
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
