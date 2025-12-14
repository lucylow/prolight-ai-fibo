export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      features: ["Limited generations", "Basic presets", "Community support"]
    },
    {
      name: "Pro",
      price: "$49/mo",
      features: [
        "Unlimited generations",
        "Batch jobs",
        "AOV outputs",
        "Brand presets"
      ]
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Dedicated models",
        "API access",
        "SLAs",
        "On-prem / VPC"
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
      <h1 className="text-4xl font-bold text-center mb-16">Pricing</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(p => (
          <div key={p.name} className="border rounded-xl p-8 bg-card">
            <h3 className="text-xl font-semibold">{p.name}</h3>
            <p className="text-3xl font-bold mt-4">{p.price}</p>
            <ul className="mt-6 space-y-2 text-muted-foreground">
              {p.features.map(f => <li key={f}>• {f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
