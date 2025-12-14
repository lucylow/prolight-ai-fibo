export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 space-y-16">
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">About ProLight AI</h1>
        <p className="text-lg text-gray-600">
          ProLight AI is building the next generation of professional creative tools by
          combining structured AI generation with decades of real-world lighting practice.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-10">
        <div>
          <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
          <p className="text-gray-600">
            We believe AI should be <strong>controllable, deterministic, and production-ready</strong>.
            ProLight AI exists to give photographers, studios, and brands the same precision
            in AI generation that they expect from real-world lighting equipment.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">Why We Built This</h3>
          <p className="text-gray-600">
            Prompt-based generation fails professionals. By building directly on Bria's
            FIBO JSON-native architecture, ProLight AI replaces guesswork with reproducible,
            auditable workflows.
          </p>
        </div>
      </section>
    </div>
  );
}
