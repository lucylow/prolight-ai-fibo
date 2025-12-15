/**
 * ToolSelector - Component for selecting and configuring tool agents
 */
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ToolType } from "@/types/workflow";

interface ToolConfig {
  [key: string]: unknown;
}

interface ToolSelectorProps {
  selectedTool: ToolType | null;
  onToolChange: (tool: ToolType) => void;
  config: ToolConfig;
  onConfigChange: (config: ToolConfig) => void;
  disabled?: boolean;
}

const TOOL_DESCRIPTIONS: Record<ToolType, string> = {
  "text-to-image": "Generate images from text prompts",
  "image-edit": "Edit and enhance existing images",
  "relight": "Adjust lighting in images",
  "generate-variants": "Create variations of images",
  "video-edit": "Edit video content",
  "upload-to-asset-library": "Upload results to asset library",
};

const TOOL_PARAMS_SCHEMA: Record<ToolType, Array<{ key: string; label: string; type: "text" | "textarea" | "number" | "boolean" }>> = {
  "text-to-image": [
    { key: "prompt", label: "Prompt", type: "textarea" },
    { key: "negative_prompt", label: "Negative Prompt", type: "textarea" },
    { key: "width", label: "Width", type: "number" },
    { key: "height", label: "Height", type: "number" },
    { key: "num_images", label: "Number of Images", type: "number" },
  ],
  "image-edit": [
    { key: "prompt", label: "Edit Instructions", type: "textarea" },
    { key: "strength", label: "Edit Strength", type: "number" },
  ],
  "relight": [
    { key: "key_intensity", label: "Key Light Intensity", type: "number" },
    { key: "fill_intensity", label: "Fill Light Intensity", type: "number" },
    { key: "temperature", label: "Color Temperature", type: "number" },
  ],
  "generate-variants": [
    { key: "num_variants", label: "Number of Variants", type: "number" },
    { key: "variation_strength", label: "Variation Strength", type: "number" },
  ],
  "video-edit": [
    { key: "prompt", label: "Edit Instructions", type: "textarea" },
    { key: "frames", label: "Number of Frames", type: "number" },
  ],
  "upload-to-asset-library": [
    { key: "folder", label: "Folder", type: "text" },
    { key: "tags", label: "Tags (comma-separated)", type: "text" },
  ],
};

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  selectedTool,
  onToolChange,
  config,
  onConfigChange,
  disabled = false,
}) => {
  const handleParamChange = (key: string, value: unknown) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  const toolParams = selectedTool ? TOOL_PARAMS_SCHEMA[selectedTool] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Selection</CardTitle>
        <CardDescription>Choose a tool agent and configure its parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tool-select">Tool</Label>
          <Select
            value={selectedTool || undefined}
            onValueChange={(value) => onToolChange(value as ToolType)}
            disabled={disabled}
          >
            <SelectTrigger id="tool-select">
              <SelectValue placeholder="Select a tool" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TOOL_DESCRIPTIONS) as ToolType[]).map((tool) => (
                <SelectItem key={tool} value={tool}>
                  <div>
                    <div className="font-medium">{tool.replace(/-/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS[tool]}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTool && (
            <p className="text-sm text-muted-foreground">{TOOL_DESCRIPTIONS[selectedTool]}</p>
          )}
        </div>

        {selectedTool && toolParams.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Parameters</h4>
            {toolParams.map((param) => (
              <div key={param.key} className="space-y-2">
                <Label htmlFor={`param-${param.key}`}>{param.label}</Label>
                {param.type === "textarea" ? (
                  <Textarea
                    id={`param-${param.key}`}
                    value={(config[param.key] as string) || ""}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    disabled={disabled}
                    rows={3}
                  />
                ) : param.type === "number" ? (
                  <Input
                    id={`param-${param.key}`}
                    type="number"
                    value={(config[param.key] as number) || ""}
                    onChange={(e) =>
                      handleParamChange(
                        param.key,
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    disabled={disabled}
                  />
                ) : (
                  <Input
                    id={`param-${param.key}`}
                    type="text"
                    value={(config[param.key] as string) || ""}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    disabled={disabled}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
