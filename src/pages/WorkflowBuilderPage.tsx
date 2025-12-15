/**
 * WorkflowBuilderPage - Page for creating new workflows
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { WorkflowBuilder } from "@/components/WorkflowBuilder/WorkflowBuilder";
import { useAgentStore } from "@/stores/agentStore";
import type { Workflow } from "@/types/workflow";

export default function WorkflowBuilderPage() {
  const navigate = useNavigate();
  const { setCurrentWorkflow } = useAgentStore();

  const handleSave = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    navigate(`/agentic/${workflow.workflow_id}`);
  };

  return (
    <div className="container mx-auto py-8">
      <WorkflowBuilder onSave={handleSave} />
    </div>
  );
}

