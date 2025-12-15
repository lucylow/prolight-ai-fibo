export default function UseCasesPage() {
  const cases = [
    {
      title: "E-commerce & Catalogs",
      desc: "Generate consistent product imagery across thousands of SKUs."
    },
    {
      title: "Advertising Creative",
      desc: "Automate multi-format ad generation with strict brand control."
    },
    {
      title: "Photography Pre-Viz",
      desc: "Design lighting setups before a physical shoot."
    },
    {
      title: "Film & Content Studios",
      desc: "Previsualize lighting and camera setups for scenes."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-12">Use Cases</h1>

      <div className="grid md:grid-cols-2 gap-10">
        {cases.map(c => (
          <div key={c.title} className="border rounded-xl p-6 bg-card">
            <h3 className="font-semibold text-lg">{c.title}</h3>
            <p className="text-muted-foreground mt-2">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

