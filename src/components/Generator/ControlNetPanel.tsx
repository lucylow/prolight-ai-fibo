import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState, useRef } from "react";
import { getPresignedUploadUrl, uploadToPresignedUrl } from "@/api/text-to-image";

interface ControlNetConfig {
  name: string;
  weight: number;
  mask_url?: string;
}

interface ControlNetPanelProps {
  value?: ControlNetConfig | null;
  onChange: (config: ControlNetConfig | null) => void;
}

const CONTROLNET_OPTIONS = [
  { value: "canny", label: "Canny (Edges)", description: "Detects and preserves edge structures" },
  { value: "depth", label: "Depth (3D Spatial)", description: "Preserves 3D spatial relationships - excellent for lighting" },
  { value: "recoloring", label: "Recoloring", description: "Transfers color palette from reference" },
  { value: "color_grid", label: "Color Grid", description: "Controls color placement precisely" },
];

export function ControlNetPanel({ value, onChange }: ControlNetPanelProps) {
  const [maskUploading, setMaskUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMaskUpload = async (file: File) => {
    setMaskUploading(true);
    try {
      const presignRes = await getPresignedUploadUrl({
        filename: file.name,
        content_type: file.type || "image/png",
        purpose: "mask",
      });

      await uploadToPresignedUrl(presignRes.upload_url, file);
      
      onChange({
        ...value!,
        mask_url: presignRes.public_url,
      });
    } catch (error) {
      console.error("Mask upload failed:", error);
    } finally {
      setMaskUploading(false);
    }
  };

  if (!value) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ControlNet</CardTitle>
          <CardDescription className="text-xs">
            Add structural control to generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => onChange({ name: "canny", weight: 0.8 })}
          >
            Enable ControlNet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">ControlNet</CardTitle>
            <CardDescription className="text-xs">
              Structural control for generation
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>ControlNet Type</Label>
          <Select
            value={value.name}
            onValueChange={(name) => onChange({ ...value, name })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTROLNET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Weight: {value.weight.toFixed(2)}</Label>
            <span className="text-xs text-muted-foreground">
              {value.weight < 0.5
                ? "More creative"
                : value.weight < 0.8
                ? "Balanced"
                : "Strict adherence"}
            </span>
          </div>
          <Slider
            value={[value.weight]}
            onValueChange={([weight]) => onChange({ ...value, weight })}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        <div className="space-y-2">
          <Label>Mask (Optional)</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleMaskUpload(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={maskUploading}
            >
              {maskUploading ? "Uploading..." : value.mask_url ? "Change Mask" : "Upload Mask"}
            </Button>
            {value.mask_url && (
              <div className="flex-1 text-xs text-muted-foreground flex items-center">
                Mask uploaded
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

