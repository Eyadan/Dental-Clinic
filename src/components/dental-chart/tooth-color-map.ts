// Maps the Tailwind bg-*/border-* tokens used in tooth-legend.ts to raw hex
// values so they can be applied as SVG fill/stroke attributes (Tailwind
// utility classes do not affect SVG `fill`/`stroke` presentation attributes).
const TAILWIND_HEX: Record<string, string> = {
  white: "#ffffff",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "red-100": "#fee2e2",
  "red-400": "#f87171",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  "purple-100": "#f3e8ff",
  "purple-400": "#c084fc",
  "purple-700": "#7e22ce",
  "indigo-100": "#e0e7ff",
  "indigo-400": "#818cf8",
  "indigo-700": "#4338ca",
  "orange-100": "#ffedd5",
  "orange-400": "#fb923c",
  "orange-700": "#c2410c",
  "cyan-100": "#cffafe",
  "cyan-400": "#22d3ee",
  "cyan-500": "#06b6d4",
  "cyan-700": "#0e7490",
  "blue-100": "#dbeafe",
  "blue-400": "#60a5fa",
  "blue-600": "#2563eb",
  "blue-700": "#1d4ed8",
  "teal-100": "#ccfbf1",
  "teal-400": "#2dd4bf",
  "teal-700": "#0f766e",
  "amber-100": "#fef3c7",
  "amber-400": "#fbbf24",
  "amber-700": "#b45309",
  "lime-100": "#ecfccb",
  "lime-400": "#a3e635",
  "lime-700": "#4d7c0f",
  "emerald-100": "#d1fae5",
  "emerald-400": "#34d399",
  "emerald-700": "#047857",
  "fuchsia-100": "#fae8ff",
  "fuchsia-400": "#e879f9",
  "fuchsia-700": "#a21caf",
  "sky-100": "#e0f2fe",
  "sky-400": "#38bdf8",
  "sky-700": "#0369a1",
  "violet-100": "#ede9fe",
  "violet-400": "#a78bfa",
  "violet-700": "#6d28d9",
  "green-100": "#dcfce7",
  "green-400": "#4ade80",
  "green-700": "#15803d",
  "rose-100": "#ffe4e6",
  "rose-400": "#fb7185",
  "rose-700": "#be123c",
};

function extractToken(colorClass: string, prefix: string): string | null {
  const match = colorClass.split(" ").find((token) => token.startsWith(prefix));
  if (!match) return null;
  return match.slice(prefix.length);
}

export function hexFromBg(colorClass: string, fallback = "#ffffff"): string {
  const token = extractToken(colorClass, "bg-");
  return (token && TAILWIND_HEX[token]) ?? fallback;
}

export function hexFromBorder(colorClass: string, fallback = "#cbd5e1"): string {
  const token = extractToken(colorClass, "border-");
  return (token && TAILWIND_HEX[token]) ?? fallback;
}
