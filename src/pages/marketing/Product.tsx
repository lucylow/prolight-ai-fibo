import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";

export default function ProductPage() {
  return (
    <>
      <SEO 
        title="ProLight AI" 
        description="Deterministic lighting control for AI image & video generation" 
      />
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold">ProLight AI</h1>
            <p className="mt-4 text-xl text-slate-200 max-w-2xl">
              Deterministic lighting control for production image and video generation — powered by FIBO.
            </p>
          </motion.div>

          <motion.div
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.12
                }
              }
            }}
          >
            {[
              { title: "Deterministic", desc: "Same parameters yield identical outputs across runs." },
              { title: "AOVs & HDR", desc: "Full control over lighting, camera, and render parameters." },
              { title: "Batch & Ads", desc: "Scale production workflows with consistent results." }
            ].map((t, i) => (
              <motion.div
                key={t.title}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="p-6 bg-slate-700/50 rounded-lg"
              >
                <h3 className="font-semibold">{t.title}</h3>
                <p className="mt-2 text-slate-200 text-sm">{t.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-20 space-y-20">
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
            <motion.div
              key={f.title}
              className="p-6 border rounded-xl bg-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-muted-foreground mt-2">{f.desc}</p>
            </motion.div>
          ))}
        </section>

        <section className="text-center">
          <motion.p
            className="text-foreground max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ProLight AI bridges professional photography workflows and AI generation by
            exposing lighting, camera, and render parameters directly to Bria's FIBO models.
          </motion.p>
        </section>
      </div>
    </>
  );
}

