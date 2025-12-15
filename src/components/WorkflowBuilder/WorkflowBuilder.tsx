/**
 * WorkflowBuilder - Main component for creating and editing workflows
 */
import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlannerStepEditor } from "./PlannerStepEditor";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createWorkflow, updateWorkflow } from "@/services/agentWorkflowService";
import { useAgentStore } from "@/stores/agentStore";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Workflow, PlanStep, WorkflowMode } from "@/types/workflow";

interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  disabled?: boolean;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflow,
  onSave,
  disabled = false,
}) => {
  const [goal, setGoal] = useState(workflow?.goal || "");
  const [mode, setMode] = useState<WorkflowMode>(workflow?.mode || "generate");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [steps, setSteps] = useState<PlanStep[]>(workflow?.plan?.steps || []);
  
  const { setCurrentWorkflow, upsertWorkflow, updateWorkflowPlan, reorderSteps } = useAgentStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  const handleGeneratePlan = useCallback(async () => {
    if (!goal.trim()) {
      toast.error("Please enter a goal");
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const response = await createWorkflow({
        goal: goal.trim(),
        mode,
      });

      setSteps(response.plan.steps);
      
      const newWorkflow: Workflow = {
        workflow_id: response.workflow_id,
        goal: goal.trim(),
        mode,
        plan: response.plan,
      };

      upsertWorkflow(newWorkflow);
      setCurrentWorkflow(newWorkflow);
      onSave?.(newWorkflow);
      
      toast.success("Plan generated successfully");
    } catch (error: any) {
      console.error("Failed to generate plan:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to generate plan");
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [goal, mode, onSave, upsertWorkflow, setCurrentWorkflow]);

  const handleSave = useCallback(async () => {
    if (!workflow?.workflow_id) {
      toast.error("No workflow to save");
      return;
    }

    try {
      const updated = await updateWorkflow(workflow.workflow_id, {
        plan: {
          steps,
          plan_version: (workflow.plan?.plan_version || 0) + 1,
        },
      });

      upsertWorkflow(updated);
      setCurrentWorkflow(updated);
      onSave?.(updated);
      toast.success("Workflow saved");
    } catch (error: any) {
      console.error("Failed to save workflow:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to save workflow");
    }
  }, [workflow, steps, onSave, upsertWorkflow, setCurrentWorkflow]);

  const handleStepUpdate = useCallback(
    (index: number, updatedStep: PlanStep) => {
      const updatedSteps = [...steps];
      updatedSteps[index] = updatedStep;
      setSteps(updatedSteps);
      
      if (workflow?.workflow_id) {
        updateWorkflowPlan(workflow.workflow_id, {
          steps: updatedSteps,
          plan_version: workflow.plan?.plan_version || 0,
        });
      }
    },
    [steps, workflow, updateWorkflowPlan]
  );

  const handleStepRemove = useCallback(
    (index: number) => {
      const updatedSteps = steps.filter((_, i) => i !== index);
      setSteps(updatedSteps);
      
      if (workflow?.workflow_id) {
        updateWorkflowPlan(workflow.workflow_id, {
          steps: updatedSteps,
          plan_version: workflow.plan?.plan_version || 0,
        });
      }
    },
    [steps, workflow, updateWorkflowPlan]
  );

  const handleAddStep = useCallback(() => {
    const newStep: PlanStep = {
      id: `step_${Date.now()}`,
      title: "New Step",
      tool: "text-to-image",
      params: {},
      order: steps.length,
    };
    setSteps([...steps, newStep]);
  }, [steps]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stepIds.indexOf(active.id as string);
      const newIndex = stepIds.indexOf(over.id as string);

      const reorderedSteps = arrayMove(steps, oldIndex, newIndex);
      setSteps(reorderedSteps);

      if (workflow?.workflow_id) {
        const stepIds = reorderedSteps.map((s) => s.id);
        reorderSteps(workflow.workflow_id, stepIds);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Goal Input */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Goal</CardTitle>
          <CardDescription>Describe what you want to achieve in natural language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Create 6 hero shots for product X with cinematic lighting..."
              disabled={disabled}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as WorkflowMode)} disabled={disabled}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generate">Generate</SelectItem>
                  <SelectItem value="refine">Refine</SelectItem>
                  <SelectItem value="inspire">Inspire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGeneratePlan}
              disabled={disabled || isGeneratingPlan || !goal.trim()}
              className="mt-6"
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Translate to Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Steps */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Plan Steps</CardTitle>
                <CardDescription>Edit, reorder, and configure workflow steps</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddStep}
                disabled={disabled}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id}>
                      <PlannerStepEditor
                        step={step}
                        onUpdate={(updatedStep) => handleStepUpdate(index, updatedStep)}
                        onRemove={() => handleStepRemove(index)}
                        disabled={disabled}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {workflow?.workflow_id && steps.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={disabled}>
            Save Workflow
          </Button>
        </div>
      )}
    </div>
  );
};
