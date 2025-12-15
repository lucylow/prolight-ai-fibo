import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Palette, Type, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBria } from '@/hooks/useBria';
import { toast } from 'sonner';

const AdsGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState('');
  const [sizes, setSizes] = useState<Array<{ width: number; height: number }>>([
    { width: 1200, height: 628 }, // Facebook/LinkedIn
    { width: 1080, height: 1080 }, // Instagram Square
    { width: 1080, height: 1920 }, // Instagram Story
  ]);

  const { generateAds, isLoading } = useBria();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter an ad description');
      return;
    }

    const brandingBlocks = [];
    if (logoUrl) {
      brandingBlocks.push({ type: 'logo', url: logoUrl });
    }
    if (primaryColor) {
      brandingBlocks.push({ type: 'color', name: 'primary', value: primaryColor });
    }
    if (secondaryColor) {
      brandingBlocks.push({ type: 'color', name: 'secondary', value: secondaryColor });
    }
    if (fontFamily) {
      brandingBlocks.push({ type: 'font', family: fontFamily });
    }

    try {
      const result = await generateAds({
        prompt,
        template_id: templateId || undefined,
        brand_id: brandId || undefined,
        branding_blocks: brandingBlocks.length > 0 ? brandingBlocks : undefined,
        sizes: sizes.length > 0 ? sizes : undefined,
      });

      if (result.request_id) {
        toast.success('Ads generation started!');
      }
    } catch (error) {
      console.error('Ads generation error:', error);
    }
  };

  const addSize = () => {
    setSizes([...sizes, { width: 1200, height: 628 }]);
  };

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
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
            Ads Generation
          </h1>
          <p className="text-muted-foreground text-lg">
            Automate ad creation at scale with brand consistency
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Configuration</CardTitle>
              <CardDescription>
                Configure your ad generation with branding elements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Ad Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the ad you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateId">Template ID (Optional)</Label>
                  <Input
                    id="templateId"
                    placeholder="template_123"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand ID (Optional)</Label>
                  <Input
                    id="brandId"
                    placeholder="brand_123"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  <h3 className="font-semibold">Branding Elements</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font">Font Family (Optional)</Label>
                  <Input
                    id="font"
                    placeholder="Arial, Helvetica, etc."
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>Ad Sizes</Label>
                  <Button variant="outline" size="sm" onClick={addSize}>
                    Add Size
                  </Button>
                </div>
                {sizes.map((size, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={size.width}
                      onChange={(e) => {
                        const newSizes = [...sizes];
                        newSizes[index].width = parseInt(e.target.value) || 0;
                        setSizes(newSizes);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Height"
                      value={size.height}
                      onChange={(e) => {
                        const newSizes = [...sizes];
                        newSizes[index].height = parseInt(e.target.value) || 0;
                        setSizes(newSizes);
                      }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSize(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Megaphone className="w-4 h-4 mr-2 animate-spin" />
                    Generating Ads...
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

          <Card>
            <CardHeader>
              <CardTitle>Preview & Results</CardTitle>
              <CardDescription>
                Generated ads will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p>Generated ads will appear here</p>
                <p className="text-sm mt-2">
                  Multiple sizes will be generated based on your configuration
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default AdsGeneration;

