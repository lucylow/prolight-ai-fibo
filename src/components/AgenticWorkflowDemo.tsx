import React, { useEffect, useState } from 'react';
import { getMockAgenticWorkflowPlan, type MockPlan, type PlanStep } from '@/api/agentic-workflow-mock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, Play, RotateCcw } from 'lucide-react';

type StepStatus = 'idle' | 'running' | 'completed' | 'failed';

export default function AgenticWorkflowDemo(): JSX.Element {
  const [plan, setPlan] = useState<MockPlan | null>(null);
  const [status, setStatus] = useState<Record<string, StepStatus>>({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch mock plan
    getMockAgenticWorkflowPlan()
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
      .catch((err) => {
        setLog((l) => [...l, 'Failed to fetch mock plan: ' + err.message]);
        setLoading(false);
      });
  }, []);

  function appendLog(line: string) {
    setLog((l) => {
      const next = [...l, line];
      return next.slice(-50); // Keep last 50 log entries
    });
  }

  // Simulate running the plan step-by-step
  async function runPlan() {
    if (!plan) return;
    setRunning(true);
    setStatus({});
    setLog([]);
    appendLog(`Starting plan: ${plan.goal}`);

    for (const step of plan.planner.plan) {
      appendLog(`→ Running step: ${step.name} (${step.tool})`);
      setStatus((s) => ({ ...s, [step.id]: 'running' }));

      // Simulate a variable duration per tool
      const durationMs = 800 + Math.floor(Math.random() * 1200);
      // Simulate async work
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, durationMs));

      // Simulate success/failure probabilistically
      const failed = Math.random() < 0.05; // Small chance to fail
      if (failed) {
        appendLog(`✖ Step failed: ${step.name}`);
        setStatus((s) => ({ ...s, [step.id]: 'failed' }));
        setRunning(false);
        return;
      } else {
        appendLog(`✔ Step completed: ${step.name}`);
        setStatus((s) => ({ ...s, [step.id]: 'completed' }));
      }
    }

    appendLog('🎉 Plan completed successfully. Results available.');
    setRunning(false);

    // Auto-select best sample
    if (plan.sample_outputs && plan.sample_outputs.length > 0) {
      const best = plan.sample_outputs.reduce(
        (a, b) => (a.score > b.score ? a : b),
        plan.sample_outputs[0]
      );
      setSelectedOutput(best.id);
    }
  }

  function resetPlan() {
    setStatus({});
    setLog([]);
    setSelectedOutput(null);
    setRunning(false);
  }

  const sampleList = plan?.sample_outputs ?? [];

  const getStatusIcon = (stepStatus: StepStatus | undefined) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (stepStatus: StepStatus | undefined) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'running':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading plan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Plan & Execution</h2>
        <p className="text-muted-foreground">{plan?.goal}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Steps</CardTitle>
            <CardDescription>Multi-step agentic workflow execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {plan ? (
                plan.planner.plan.map((step) => {
                  const stepStatus = status[step.id] ?? 'idle';
                  return (
                    <div
                      key={step.id}
                      className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${getStatusColor(stepStatus)}`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">{getStatusIcon(stepStatus)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{step.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {step.tool} • {JSON.stringify(step.params)}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`ml-2 capitalize ${getStatusColor(stepStatus)}`}
                      >
                        {stepStatus}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm">
                  No plan available
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={runPlan}
                disabled={!plan || running}
                className="flex-1"
                size="lg"
              >
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Plan
                  </>
                )}
              </Button>
              <Button
                onClick={resetPlan}
                variant="outline"
                disabled={running}
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outputs & Logs */}
        <div className="space-y-4">
          {/* Sample Outputs */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Outputs</CardTitle>
              <CardDescription>Generated images from the workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sampleList.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm text-center">
                    No sample outputs available
                  </div>
                ) : (
                  sampleList.map((out) => (
                    <div
                      key={out.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedOutput === out.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card hover:bg-muted/50'
                      }`}
                    >
                      <img
                        src={out.url}
                        alt={out.id}
                        className="w-16 h-16 object-cover rounded-md border"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{out.id}</div>
                        <div className="text-xs text-muted-foreground">
                          seed: {out.seed} • score: {out.score.toFixed(2)}
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedOutput(out.id)}
                        variant={selectedOutput === out.id ? 'default' : 'outline'}
                        size="sm"
                      >
                        {selectedOutput === out.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>Real-time workflow execution events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto p-3 rounded-lg bg-muted/50 font-mono text-xs space-y-1">
                {log.length === 0 ? (
                  <div className="text-muted-foreground">
                    No logs yet. Run the plan to see simulated events.
                  </div>
                ) : (
                  log.map((l, i) => (
                    <div key={i} className="text-foreground/80">
                      {l}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

