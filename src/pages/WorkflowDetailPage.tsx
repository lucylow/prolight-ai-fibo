/**
 * WorkflowDetailPage - Page for viewing and managing a specific workflow and its runs
 */
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getWorkflow, startRun, getRunStatus } from "@/services/agentWorkflowService";
import { useAgentStore } from "@/stores/agentStore";
import { WorkflowBuilder } from "@/components/WorkflowBuilder/WorkflowBuilder";
import { RunControls } from "@/components/Run/RunControls";
import { LiveStatusPanel } from "@/components/Run/LiveStatusPanel";
import { ExecutionLog } from "@/components/Run/ExecutionLog";
import { ArtifactsGallery } from "@/components/Artifacts/ArtifactsGallery";

export default function WorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { workflows, runs, currentWorkflow, setCurrentWorkflow, setCurrentRun } = useAgentStore();
  const [loading, setLoading] = React.useState(true);

  const workflow = workflowId ? workflows[workflowId] || currentWorkflow : null;
  const currentRunId = workflow ? Object.values(runs).find((r) => r.workflow_id === workflow.workflow_id)?.run_id : null;
  const run = currentRunId ? runs[currentRunId] : null;

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    if (!workflowId) return;

    setLoading(true);
    try {
      const wf = await getWorkflow(workflowId);
      useAgentStore.getState().upsertWorkflow(wf);
      setCurrentWorkflow(wf);

      // Load run status if there's an active run
      const activeRun = Object.values(useAgentStore.getState().runs).find(
        (r) => r.workflow_id === workflowId && (r.status === "running" || r.status === "queued")
      );
      if (activeRun) {
        try {
          const runStatus = await getRunStatus(activeRun.run_id);
          useAgentStore.getState().upsertRun(runStatus);
          setCurrentRun(runStatus);
        } catch (error) {
          console.error("Failed to load run status:", error);
        }
      }
    } catch (error: any) {
      console.error("Failed to load workflow:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to load workflow");
      navigate("/agentic");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRun = async () => {
    if (!workflowId) return;

    try {
      const response = await startRun(workflowId);
      useAgentStore.getState().upsertRun({
        run_id: response.run_id,
        workflow_id: workflowId,
        status: response.status,
        sse_token: response.sse_token,
      });
      setCurrentRun({
        run_id: response.run_id,
        workflow_id: workflowId,
        status: response.status,
        sse_token: response.sse_token,
      });
      toast.success("Run started successfully");
    } catch (error: any) {
      console.error("Failed to start run:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to start run");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12 text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Workflow not found</h3>
            <Button onClick={() => navigate("/agentic")} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runLogs = run ? useAgentStore.getState().logs[run.run_id] || [] : [];
  const runArtifacts = run ? useAgentStore.getState().artifacts[run.run_id] || [] : [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/agentic")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Workflow Details</h1>
          <p className="text-muted-foreground mt-1">{workflow.goal}</p>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="run">Run & Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <WorkflowBuilder workflow={workflow} />
        </TabsContent>

        <TabsContent value="run" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Run Controls</CardTitle>
                  <CardDescription>Start and manage workflow execution</CardDescription>
                </div>
                <RunControls
                  run={run}
                  workflowId={workflow.workflow_id}
                  onRunStart={handleStartRun}
                />
              </div>
            </CardHeader>
          </Card>

          {run && (
            <>
              <LiveStatusPanel run={run} workflowId={workflow.workflow_id} />

              <Tabs defaultValue="logs" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                </TabsList>

                <TabsContent value="logs">
                  <ExecutionLog logs={runLogs} />
                </TabsContent>

                <TabsContent value="artifacts">
                  <Card>
                    <CardHeader>
                      <CardTitle>Artifacts</CardTitle>
                      <CardDescription>{runArtifacts.length} artifact(s) generated</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ArtifactsGallery artifacts={runArtifacts} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}

          {!run && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No run in progress. Start a run to see execution logs and artifacts.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

