import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  showStats?: boolean;
}

export function PromptInput({
  value,
  onChange,
  placeholder = "Describe the image you want to generate...",
  maxLength = 2000,
  showStats = true,
}: PromptInputProps) {
  const stats = useMemo(() => {
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    const chars = value.length;
    const complexity = chars > 500 ? "high" : chars > 200 ? "medium" : "low";
    return { words, chars, complexity, remaining: maxLength - chars };
  }, [value, maxLength]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="prompt">Text Prompt</Label>
        {showStats && (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{stats.words} words</Badge>
            <Badge variant={stats.complexity === "high" ? "default" : "outline"}>
              {stats.complexity} complexity
            </Badge>
            <span>{stats.remaining} chars left</span>
          </div>
        )}
      </div>
      <Textarea
        id="prompt"
        className="w-full min-h-[120px] font-sans"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
      {stats.remaining < 50 && (
        <p className="text-sm text-warning">Approaching character limit</p>
      )}
    </div>
  );
}

