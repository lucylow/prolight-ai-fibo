/**
 * AgentOrchestratorPage - Main page listing all workflows
 */
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { listWorkflows } from "@/services/agentWorkflowService";
import { useAgentStore } from "@/stores/agentStore";
import { RBACGate } from "@/components/auth/RBACGate";
import type { Workflow } from "@/types/workflow";

export default function AgentOrchestratorPage() {
  const navigate = useNavigate();
  const { workflows, setCurrentWorkflow } = useAgentStore();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const workflowList = await listWorkflows();
      workflowList.forEach((wf) => useAgentStore.getState().upsertWorkflow(wf));
    } catch (error: unknown) {
      console.error("Failed to load workflows:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : "Failed to load workflows";
      toast.error(errorMessage || "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate("/agentic/new");
  };

  const handleOpenWorkflow = (workflowId: string) => {
    const workflow = workflows[workflowId];
    if (workflow) {
      setCurrentWorkflow(workflow);
      navigate(`/agentic/${workflowId}`);
    }
  };

  const workflowList = Object.values(workflows);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentic Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage AI-powered workflow automation
          </p>
        </div>
        <RBACGate roles={["admin", "editor"]}>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </RBACGate>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading workflows...</div>
      ) : workflowList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first agentic workflow to get started
            </p>
            <RBACGate roles={["admin", "editor"]}>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </RBACGate>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowList.map((workflow) => (
            <Card
              key={workflow.workflow_id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleOpenWorkflow(workflow.workflow_id)}
            >
              <CardHeader>
                <CardTitle className="truncate">{workflow.goal || "Untitled Workflow"}</CardTitle>
                <CardDescription>
                  {workflow.plan?.steps.length || 0} step(s) • Mode: {workflow.mode || "generate"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{workflow.created_at ? new Date(workflow.created_at).toLocaleDateString() : "No date"}</span>
                  <FolderOpen className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

