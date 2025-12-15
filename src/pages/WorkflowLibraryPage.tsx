/**
 * WorkflowLibraryPage - Page for browsing saved workflow templates and presets
 */
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Star } from "lucide-react";
import { listWorkflows } from "@/services/agentWorkflowService";
import { useAgentStore } from "@/stores/agentStore";
import type { Workflow } from "@/types/workflow";

export default function WorkflowLibraryPage() {
  const navigate = useNavigate();
  const { workflows, setCurrentWorkflow } = useAgentStore();
  const [searchQuery, setSearchQuery] = React.useState("");
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
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkflow = (workflowId: string) => {
    const workflow = workflows[workflowId];
    if (workflow) {
      setCurrentWorkflow(workflow);
      navigate(`/agentic/${workflowId}`);
    }
  };

  const filteredWorkflows = Object.values(workflows).filter((wf) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      wf.goal?.toLowerCase().includes(query) ||
      wf.mode?.toLowerCase().includes(query) ||
      wf.meta?.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Library</h1>
        <p className="text-muted-foreground mt-1">
          Browse and reuse saved workflow templates
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading library...</div>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No workflows found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search query" : "No workflows in library yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card
              key={workflow.workflow_id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleOpenWorkflow(workflow.workflow_id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{workflow.goal || "Untitled Workflow"}</CardTitle>
                    <CardDescription>
                      {workflow.plan?.steps.length || 0} step(s)
                    </CardDescription>
                  </div>
                  <Star className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflow.mode && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Mode: </span>
                      <span className="capitalize">{workflow.mode}</span>
                    </div>
                  )}
                  {workflow.meta?.tags && workflow.meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {workflow.meta.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenWorkflow(workflow.workflow_id);
                    }}
                  >
                    Open Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

