import { motion } from "framer-motion";

interface Props {
  title: string;
  items: string[];
}

export function CanvasSection({ title, items }: Props) {
  return (
    <motion.section
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:border-white/20 transition-colors"
    >
      <h3 className="text-lg font-medium mb-4 text-white">
        {title}
      </h3>

      <ul className="space-y-3 text-sm text-white/80">
        {items.map((item, idx) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="leading-relaxed flex gap-2"
          >
            <span className="text-white/40 flex-shrink-0">•</span>
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
