export default function ProductPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 space-y-20">
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-bold">
          ProLight AI
        </h1>
        <p className="text-xl text-muted-foreground">
          Deterministic lighting control for AI image & video generation — powered by FIBO.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        {[
          {
            title: "Structured Generation",
            desc: "Replace prompt guessing with JSON-native lighting, camera and render controls."
          },
          {
            title: "Deterministic Outputs",
            desc: "Same parameters → same results. Built for production, not vibes."
          },
          {
            title: "Professional Workflow",
            desc: "Lighting presets, batch jobs, versioning, AOVs, and auditability."
          }
        ].map(f => (
          <div key={f.title} className="p-6 border rounded-xl bg-card">
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="text-muted-foreground mt-2">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="text-center">
        <p className="text-foreground max-w-3xl mx-auto">
          ProLight AI bridges professional photography workflows and AI generation by
          exposing lighting, camera, and render parameters directly to Bria's FIBO models.
        </p>
      </section>
    </div>
  );
}
