import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";

interface FiboEditorProps {
  value?: Record<string, unknown>;
  onChange: (value: Record<string, unknown> | undefined) => void;
  showToggle?: boolean;
}

export function FiboEditor({
  value,
  onChange,
  showToggle = true,
}: FiboEditorProps) {
  const [jsonString, setJsonString] = useState(() =>
    value ? JSON.stringify(value, null, 2) : ""
  );
  const [isExpanded, setIsExpanded] = useState(!showToggle);

  const validation = useMemo(() => {
    if (!jsonString.trim()) {
      return { valid: true, error: null };
    }
    try {
      JSON.parse(jsonString);
      return { valid: true, error: null };
    } catch (e) {
      return {
        valid: false,
        error: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [jsonString]);

  const handleChange = (newJson: string) => {
    setJsonString(newJson);
    if (newJson.trim()) {
      try {
        const parsed = JSON.parse(newJson);
        onChange(parsed);
      } catch {
        // Invalid JSON, don't update
      }
    } else {
      onChange(undefined);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonString(formatted);
      onChange(parsed);
    } catch {
      // Ignore if invalid
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsExpanded(true)}
        className="w-full"
      >
        Show FIBO JSON Editor
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">FIBO JSON Editor</CardTitle>
            <CardDescription className="text-xs">
              Optional structured prompt override
            </CardDescription>
          </div>
          {showToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              Hide
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Structured FIBO JSON</Label>
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Valid JSON
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                Invalid JSON
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleFormat}>
              Format
            </Button>
          </div>
        </div>
        <Textarea
          className="font-mono text-sm min-h-[300px]"
          placeholder='{"lighting": {...}, "subject": {...}, "camera": {...}}'
          value={jsonString}
          onChange={(e) => handleChange(e.target.value)}
        />
        {validation.error && (
          <p className="text-sm text-destructive">{validation.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

