export default function DocsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid md:grid-cols-4 gap-10">
      <aside className="space-y-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Getting Started</p>
        <p>API Overview</p>
        <p>FIBO JSON Schema</p>
        <p>Generation</p>
        <p>Refinement</p>
        <p>Status & Jobs</p>
      </aside>

      <main className="md:col-span-3 space-y-6">
        <h1 className="text-3xl font-bold">Documentation</h1>

        <p>
          ProLight AI exposes a structured, deterministic interface on top of
          Bria's FIBO generation models. All generation is driven by validated JSON.
        </p>

        <pre className="bg-muted text-primary p-4 rounded border">
{`POST /text-to-image
{
  "prompt": { "lighting": {...} },
  "model_version": "v2",
  "seed": 42
}`}
        </pre>

        <p className="text-muted-foreground">
          All endpoints support async workflows, job polling, and batch execution.
        </p>
      </main>
    </div>
  );
}

