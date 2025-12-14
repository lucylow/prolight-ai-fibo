export function CanvasHeader() {
  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    // This can generate a branded PDF with metrics, pricing tiers, etc.
    console.log("Export PDF clicked - implement PDF generation");
  };

  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              ProLight AI
            </h1>

            <p className="text-lg text-white/70 mt-2 max-w-3xl">
              Precision Lighting, Powered by FIBO — deterministic, reproducible
              lighting workflows for studios, agencies, and creators.
            </p>

            <div className="mt-6 inline-flex items-center rounded-full bg-white/5 px-4 py-2 text-sm text-white/70">
              Business Model Canvas
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            Export Investor PDF
          </button>
        </div>
      </div>
    </header>
  );
}
