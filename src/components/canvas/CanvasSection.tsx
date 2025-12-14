import { motion } from "framer-motion";

interface Props {
  title: string;
  items: string[];
}

export function CanvasSection({ title, items }: Props) {
  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
    >
      <h3 className="text-lg font-medium mb-4 text-white">
        {title}
      </h3>

      <ul className="space-y-3 text-sm text-white/80">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="leading-relaxed flex gap-2"
          >
            <span className="text-white/40">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
