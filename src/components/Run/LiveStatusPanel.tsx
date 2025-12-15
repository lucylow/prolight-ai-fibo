/**
 * LiveStatusPanel - Component for displaying live run progress via SSE
 */
import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSSE } from "@/hooks/useSSE";
import { useAgentStore } from "@/stores/agentStore";
import { ArtifactsGallery } from "@/components/Artifacts/ArtifactsGallery";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { Run, RunStatus } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface LiveStatusPanelProps {
  run: Run | null;
  workflowId: string;
}

const STATUS_COLORS: Record<RunStatus, string> = {
  queued: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  paused: "bg-orange-500",
  cancelled: "bg-gray-500",
};

const STATUS_ICONS: Record<RunStatus, React.ReactNode> = {
  queued: <Clock className="w-4 h-4" />,
  running: <Loader2 className="w-4 h-4 animate-spin" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  failed: <XCircle className="w-4 h-4" />,
  paused: <Clock className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

export const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({ run, workflowId }) => {
  const { logs, artifacts, sseConnections } = useAgentStore();
  const [stepProgress, setStepProgress] = React.useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = React.useState(0);

  // Subscribe to SSE events
  const { isConnected } = useSSE(
    run?.run_id || null,
    run?.sse_token || null,
    {
      enabled: !!run && (run.status === "running" || run.status === "queued"),
      onEvent: (event) => {
        if (event.type === "progress" && event.percent !== undefined) {
          if (event.step_id) {
            setStepProgress((prev) => ({
              ...prev,
              [event.step_id]: event.percent,
            }));
          } else {
            setOverallProgress(event.percent);
          }
        }
      },
    }
  );

  const runLogs = run ? logs[run.run_id] || [] : [];
  const runArtifacts = run ? artifacts[run.run_id] || [] : [];
  const connection = run ? sseConnections[run.run_id] : null;

  useEffect(() => {
    // Calculate overall progress from step progress
    const stepIds = Object.keys(stepProgress);
    if (stepIds.length > 0) {
      const avg = stepIds.reduce((sum, id) => sum + stepProgress[id], 0) / stepIds.length;
      setOverallProgress(Math.round(avg));
    }
  }, [stepProgress]);

  if (!run) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No run in progress
        </CardContent>
      </Card>
    );
  }

  const statusColor = STATUS_COLORS[run.status] || "bg-gray-500";
  const statusIcon = STATUS_ICONS[run.status];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Run Status</CardTitle>
              <CardDescription>Workflow execution progress</CardDescription>
            </div>
            <Badge variant="outline" className={cn("flex items-center gap-2", statusColor, "text-white")}>
              {statusIcon}
              <span className="capitalize">{run.status}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {/* SSE Connection Status */}
          {connection && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  connection.status === "connected"
                    ? "bg-green-500"
                    : connection.status === "reconnecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                )}
              />
              <span className="capitalize">{connection.status}</span>
            </div>
          )}

          {/* Step Progress */}
          {Object.keys(stepProgress).length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">Step Progress</h4>
              {Object.entries(stepProgress).map(([stepId, progress]) => (
                <div key={stepId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{stepId}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </div>
          )}

          {/* Recent Logs Preview */}
          {runLogs.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">Recent Activity</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {runLogs.slice(-5).map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "text-xs p-2 rounded",
                      log.level === "error" && "bg-destructive/10 text-destructive",
                      log.level === "warn" && "bg-yellow-500/10 text-yellow-700",
                      log.level === "info" && "bg-blue-500/10 text-blue-700"
                    )}
                  >
                    <span className="font-mono text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>{" "}
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Artifacts */}
      {runArtifacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Artifacts</CardTitle>
            <CardDescription>Outputs from workflow execution</CardDescription>
          </CardHeader>
          <CardContent>
            <ArtifactsGallery artifacts={runArtifacts} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

