import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// This dashboard uses mock data but mirrors the metrics expected from
// Lovable analytics: RPS, popular instructions, presets, funnel, geo usage, cost.

const requestsPerSecond = [
  { time: "00:00", natural: 12, generate: 5 },
  { time: "00:05", natural: 21, generate: 9 },
  { time: "00:10", natural: 18, generate: 11 },
  { time: "00:15", natural: 30, generate: 15 },
];

const topInstructions = [
  { phrase: "more dramatic", count: 43 },
  { phrase: "golden hour rim", count: 29 },
  { phrase: "soft studio clean", count: 21 },
  { phrase: "ecommerce white", count: 17 },
];

const presetUsage = [
  { type: "wedding_romantic", usage: 67 },
  { type: "product_studio", usage: 54 },
  { type: "portrait_dramatic", usage: 41 },
  { type: "ecommerce_clean", usage: 49 },
];

const funnelData = [
  { stage: "analyze", count: 1000 },
  { stage: "edit", count: 720 },
  { stage: "generate", count: 640 },
  { stage: "batch", count: 480 },
];

const geoUsage = [
  { region: "NA", count: 4200 },
  { region: "EU", count: 3100 },
  { region: "APAC", count: 1900 },
  { region: "LATAM", count: 800 },
];

const costBreakdown = [
  { provider: "BRIA", cost: 120.5 },
  { provider: "FAL.ai", cost: 42.3 },
];

const COLORS = ["#6366F1", "#EC4899", "#10B981", "#F97316", "#0EA5E9"];

export default function AnalyticsDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-8 py-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            ProLight AI – Edge Analytics
          </h1>
          <p className="text-sm text-slate-400">
            Real-time view of natural language → FIBO JSON, generation load,
            presets, and cost across the Lovable Edge CDN.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Live
          </span>
          <span className="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
            Env: {import.meta.env.VITE_PROLIGHT_ENV ?? "DEV"}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Requests / second by function
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={requestsPerSecond}>
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="natural"
                  stroke="#6366F1"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="generate"
                  stroke="#EC4899"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-medium text-slate-200">
            Top natural language instructions
          </h2>
          <ul className="space-y-2 text-sm">
            {topInstructions.map((item, i) => (
              <li
                key={item.phrase}
                className="flex items-center justify-between"
              >
                <span className="truncate max-w-[60%]">
                  {i + 1}. {item.phrase}
                </span>
                <span className="text-slate-400">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Preset usage by type
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={presetUsage}>
                <XAxis dataKey="type" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="usage" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Funnel: analysis → edit → generate → batch
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="stage" type="category" stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="count" fill="#EC4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Global usage (edge regions)
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={geoUsage}
                  dataKey="count"
                  nameKey="region"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {geoUsage.map((entry, index) => (
                    <Cell
                      key={entry.region}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Error rates & failure patterns
          </h2>
          <p className="text-xs text-slate-400 mb-2">
            (Mock) p95 & p99 latencies and error rates pulled from Lovable logs.
          </p>
          <ul className="text-sm space-y-1">
            <li className="flex justify-between">
              <span>natural-language-lighting</span>
              <span className="text-emerald-400">0.4% error · 420ms p95</span>
            </li>
            <li className="flex justify-between">
              <span>generate-lighting</span>
              <span className="text-amber-400">0.9% error · 860ms p95</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Cost breakdown (BRIA vs FAL.ai)
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costBreakdown}>
                <XAxis dataKey="provider" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {costBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.provider}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}


