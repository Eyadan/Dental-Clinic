import { PRESENCE_LEGEND, CONDITION_LEGEND, RESTORATION_LEGEND, SURGERY_LEGEND } from "./tooth-legend";

function LegendGroup({ title, entries }: { title: string; entries: { code: string; label: string; colorClass: string }[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2 text-[11px]">
            <span className={`flex h-5 w-6 shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold ${entry.colorClass}`}>
              {entry.code}
            </span>
            <span className="text-muted-foreground">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DentalChartLegend() {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <LegendGroup title="Presence" entries={Object.values(PRESENCE_LEGEND)} />
      <LegendGroup title="Conditions" entries={Object.values(CONDITION_LEGEND)} />
      <LegendGroup title="Restorations & Prosthetics" entries={Object.values(RESTORATION_LEGEND)} />
      <LegendGroup title="Surgery" entries={Object.values(SURGERY_LEGEND)} />
    </div>
  );
}
