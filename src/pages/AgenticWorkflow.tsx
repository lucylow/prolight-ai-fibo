import { Sparkles } from 'lucide-react';
import AgenticWorkflowDemo from '@/components/AgenticWorkflowDemo';

const AgenticWorkflow = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Agentic Workflow — Demo
        </h1>
        <p className="text-muted-foreground text-lg">
          Multi-step agentic workflow demo — plan, execute, evaluate (mocked data)
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          This page runs a client-side demo of a multi-step agentic workflow (planner → tools → evaluate). 
          Data is mocked via the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">agentic-workflow-mock</code> service.
        </p>
      </div>

      <AgenticWorkflowDemo />
    </div>
  );
};

export default AgenticWorkflow;
