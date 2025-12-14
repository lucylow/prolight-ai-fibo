export default function FeaturesPage() {
  const features = [
    {
      title: "3D Lighting Previsualization",
      desc: "Drag lights in 3D space and see the exact lighting logic before generation."
    },
    {
      title: "FIBO JSON Control",
      desc: "Direct mapping between UI and Bria's structured generation schema."
    },
    {
      title: "Disentangled Edits",
      desc: "Change one parameter without drifting subject, style, or materials."
    },
    {
      title: "Batch & Ads Automation",
      desc: "Generate hundreds of assets programmatically using brand-safe templates."
    },
    {
      title: "AOV & HDR Outputs",
      desc: "Beauty, diffuse, specular, depth, masks — ready for compositing."
    },
    {
      title: "Async Video Processing",
      desc: "Upscale, relight, and transform video via job-based workflows."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-12">Features</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {features.map(f => (
          <div key={f.title} className="p-6 border rounded-xl bg-card">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="text-muted-foreground mt-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
