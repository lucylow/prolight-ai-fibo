/**
 * PlannerStepEditor - Component for editing individual plan steps
 */
import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolSelector } from "./ToolSelector";
import { GuidanceImageUploader } from "@/components/Uploads/GuidanceImageUploader";
import { X, Lock, GripVertical } from "lucide-react";
import type { PlanStep, ToolType, GuidanceImage } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface PlannerStepEditorProps {
  step: PlanStep;
  onUpdate: (step: PlanStep) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export const PlannerStepEditor: React.FC<PlannerStepEditorProps> = ({
  step,
  onUpdate,
  onRemove,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleChange = (title: string) => {
    onUpdate({ ...step, title });
  };

  const handleToolChange = (tool: ToolType) => {
    onUpdate({ ...step, tool, params: {} });
  };

  const handleParamsChange = (params: Record<string, unknown>) => {
    onUpdate({ ...step, params });
  };

  const handleGuidanceImagesChange = (images: GuidanceImage[]) => {
    onUpdate({ ...step, guidance_images: images });
  };

  const isLocked = (field: string) => step.locked_fields?.includes(field) || false;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all",
        isDragging && "opacity-50",
        isExpanded && "border-primary"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-move p-1 h-auto"
              disabled={disabled}
              aria-label="Reorder step"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
            <div className="flex-1 min-w-0">
              <Input
                value={step.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={disabled || isLocked("title")}
                placeholder="Step title"
                className="font-medium"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step.locked_fields && step.locked_fields.length > 0 && (
              <Lock
                className="w-4 h-4 text-muted-foreground"
                aria-label="Some fields are locked"
                role="img"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "−" : "+"}
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                disabled={disabled}
                aria-label="Remove step"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-4">
            <ToolSelector
              selectedTool={step.tool}
              onToolChange={handleToolChange}
              config={step.params || {}}
              onConfigChange={handleParamsChange}
              disabled={disabled || isLocked("tool")}
            />

            <div className="space-y-2">
              <Label>Guidance Images</Label>
              <GuidanceImageUploader
                onImagesUploaded={handleGuidanceImagesChange}
                existingImages={step.guidance_images || []}
                maxImages={5}
                disabled={disabled || isLocked("guidance_images")}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};


