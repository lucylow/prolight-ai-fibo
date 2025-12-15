import { motion } from "framer-motion";
import { CanvasSection } from "@/components/canvas/CanvasSection";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import {
  valueProps,
  customerSegments,
  channels,
  relationships,
  revenueStreams,
  keyResources,
  keyActivities,
  keyPartners,
  costStructure,
} from "@/data/businessModel";

export default function BusinessModelCanvas() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <CanvasHeader />

      <main className="max-w-7xl mx-auto px-6 py-12" id="main-content">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <CanvasSection title="Value Proposition" items={valueProps} />
          <CanvasSection title="Customer Segments" items={customerSegments} />
          <CanvasSection title="Channels" items={channels} />
          <CanvasSection title="Customer Relationships" items={relationships} />
          <CanvasSection title="Revenue Streams" items={revenueStreams} />
          <CanvasSection title="Key Resources" items={keyResources} />
          <CanvasSection title="Key Activities" items={keyActivities} />
          <CanvasSection title="Key Partners" items={keyPartners} />
          <CanvasSection title="Cost Structure" items={costStructure} />
        </motion.div>
      </main>
    </div>
  );
}

