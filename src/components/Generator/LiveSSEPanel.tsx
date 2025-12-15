import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import type { ArtifactInfo } from "@/api/text-to-image";

interface SSEEvent {
  type: "progress" | "log" | "variant" | "artifact" | "final" | "error";
  run_id: string;
  percent?: number;
  step?: string;
  message?: string;
  status?: string;
  payload?: {
    artifacts?: ArtifactInfo[];
    variant_index?: number;
    cost_cents?: number;
    cached_hit?: boolean;
  };
}

interface LiveSSEPanelProps {
  runId: string;
  sseToken: string;
  onArtifacts?: (artifacts: ArtifactInfo[]) => void;
  onComplete?: (status: string) => void;
}

export function LiveSSEPanel({
  runId,
  sseToken,
  onArtifacts,
  onComplete,
}: LiveSSEPanelProps) {
  const [status, setStatus] = useState<string>("connecting");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Connecting...");
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/status/stream/${runId}?token=${encodeURIComponent(sseToken)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);

        switch (data.type) {
          case "progress":
            setStatus(data.step || "processing");
            setProgress(data.percent || 0);
            setMessage(data.message || "");
            break;

          case "artifact":
            if (data.payload?.artifacts) {
              const newArtifacts = data.payload.artifacts;
              setArtifacts((prev) => {
                const combined = [...prev];
                newArtifacts.forEach((newArt) => {
                  const existingIndex = combined.findIndex((a) => a.id === newArt.id);
                  if (existingIndex >= 0) {
                    combined[existingIndex] = newArt;
                  } else {
                    combined.push(newArt);
                  }
                });
                return combined;
              });
              onArtifacts?.(newArtifacts);
            }
            break;

          case "log":
            setLogs((prev) => [...prev, data.message || ""]);
            break;

          case "final":
            setStatus(data.status || "completed");
            setProgress(100);
            setMessage(data.message || "Completed");
            onComplete?.(data.status || "completed");
            eventSource.close();
            break;

          case "error":
            setStatus("error");
            setMessage(data.message || "An error occurred");
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    eventSource.onerror = () => {
      setStatus("error");
      setMessage("Connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId, sseToken, onArtifacts, onComplete]);

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "connecting":
        return <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-600";
      case "failed":
      case "error":
        return "bg-red-600";
      default:
        return "bg-primary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {getStatusIcon()}
          Generation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <Badge variant="outline">{progress}%</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge className={getStatusColor()}>{status}</Badge>
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>

        {artifacts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Generated Artifacts</div>
            <div className="grid grid-cols-2 gap-2">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="relative aspect-square bg-muted rounded overflow-hidden">
                  <img
                    src={artifact.thumb_url || artifact.url}
                    alt={`Artifact ${artifact.variant_index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Logs</div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted-foreground font-mono">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

