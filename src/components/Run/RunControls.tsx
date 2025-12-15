/**
 * RunControls - Component for starting, pausing, cancelling, and retrying runs
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RotateCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { runAction } from "@/services/agentWorkflowService";
import { useAgentStore } from "@/stores/agentStore";
import { RBACButton } from "@/components/auth/RBACGate";
import type { Run, RunStatus } from "@/types/workflow";

interface RunControlsProps {
  run: Run | null;
  workflowId: string;
  onRunStart?: () => void;
  disabled?: boolean;
}

export const RunControls: React.FC<RunControlsProps> = ({
  run,
  workflowId,
  onRunStart,
  disabled = false,
}) => {
  const { updateRunStatus } = useAgentStore();
  const [isActioning, setIsActioning] = React.useState(false);

  const handleAction = async (action: "pause" | "resume" | "cancel" | "retry", stepId?: string) => {
    if (!run) return;

    setIsActioning(true);
    try {
      await runAction(run.run_id, {
        action,
        step_id: stepId,
      });

      let newStatus: RunStatus = run.status;
      if (action === "pause") newStatus = "paused";
      else if (action === "resume") newStatus = "running";
      else if (action === "cancel") newStatus = "cancelled";
      else if (action === "retry") newStatus = "running";

      updateRunStatus(run.run_id, newStatus);
      toast.success(`Run ${action}ed successfully`);
    } catch (error: unknown) {
      console.error(`Failed to ${action} run:`, error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data && typeof error.response.data.message === 'string'
          ? error.response.data.message
          : `Failed to ${action} run`);
      toast.error(errorMessage);
    } finally {
      setIsActioning(false);
    }
  };

  const canStart = !run || run.status === "failed" || run.status === "cancelled";
  const canPause = run?.status === "running";
  const canResume = run?.status === "paused";
  const canCancel = run && (run.status === "running" || run.status === "queued" || run.status === "paused");
  const canRetry = run?.status === "failed";

  if (canStart) {
    return (
      <RBACButton
        roles={["admin", "editor"]}
        onClick={onRunStart}
        disabled={disabled || isActioning}
      >
        <Play className="w-4 h-4 mr-2" />
        {isActioning ? "Starting..." : "Start Run"}
      </RBACButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {canResume && (
        <RBACButton
          roles={["admin", "editor"]}
          variant="outline"
          onClick={() => handleAction("resume")}
          disabled={disabled || isActioning}
        >
          {isActioning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Resume
        </RBACButton>
      )}

      {canPause && (
        <RBACButton
          roles={["admin", "editor"]}
          variant="outline"
          onClick={() => handleAction("pause")}
          disabled={disabled || isActioning}
        >
          {isActioning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Pause className="w-4 h-4 mr-2" />
          )}
          Pause
        </RBACButton>
      )}

      {canCancel && (
        <RBACButton
          roles={["admin", "editor"]}
          variant="destructive"
          onClick={() => handleAction("cancel")}
          disabled={disabled || isActioning}
        >
          {isActioning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Square className="w-4 h-4 mr-2" />
          )}
          Cancel
        </RBACButton>
      )}

      {canRetry && (
        <RBACButton
          roles={["admin", "editor"]}
          variant="outline"
          onClick={() => handleAction("retry")}
          disabled={disabled || isActioning}
        >
          {isActioning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4 mr-2" />
          )}
          Retry
        </RBACButton>
      )}

      {run && (run.status === "queued" || run.status === "running") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="capitalize">{run.status}</span>
        </div>
      )}
    </div>
  );
};


