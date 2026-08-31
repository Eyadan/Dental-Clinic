"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DentalChartMetaInput } from "@/lib/validations/dental-chart.schema";

interface DentalChartScreeningProps {
  meta: DentalChartMetaInput;
  onChange: (meta: DentalChartMetaInput) => void;
  disabled?: boolean;
}

function CheckItem({
  label,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 text-[11px] font-medium cursor-pointer hover:bg-cyan-500/10">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-cyan-600 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function DentalChartScreening({ meta, onChange, disabled }: DentalChartScreeningProps) {
  const set = <K extends keyof DentalChartMetaInput>(key: K, value: DentalChartMetaInput[K]) =>
    onChange({ ...meta, [key]: value });

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase text-muted-foreground">Periodontal Screening</p>
        <CheckItem label="Gingivitis" checked={!!meta.periodontal_gingivitis} onToggle={(v) => set("periodontal_gingivitis", v)} disabled={disabled} />
        <CheckItem label="Early Periodontitis" checked={!!meta.periodontal_early_periodontitis} onToggle={(v) => set("periodontal_early_periodontitis", v)} disabled={disabled} />
        <CheckItem label="Moderate Periodontitis" checked={!!meta.periodontal_moderate_periodontitis} onToggle={(v) => set("periodontal_moderate_periodontitis", v)} disabled={disabled} />
        <CheckItem label="Advanced Periodontitis" checked={!!meta.periodontal_advanced_periodontitis} onToggle={(v) => set("periodontal_advanced_periodontitis", v)} disabled={disabled} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase text-muted-foreground">Occlusion</p>
        <CheckItem label="Class (Molar)" checked={!!meta.occlusion_class_molar} onToggle={(v) => set("occlusion_class_molar", v)} disabled={disabled} />
        <CheckItem label="Overjet" checked={!!meta.occlusion_overjet} onToggle={(v) => set("occlusion_overjet", v)} disabled={disabled} />
        <CheckItem label="Overbite" checked={!!meta.occlusion_overbite} onToggle={(v) => set("occlusion_overbite", v)} disabled={disabled} />
        <CheckItem label="Midline Deviation" checked={!!meta.occlusion_midline_deviation} onToggle={(v) => set("occlusion_midline_deviation", v)} disabled={disabled} />
        <CheckItem label="Crossbite" checked={!!meta.occlusion_crossbite} onToggle={(v) => set("occlusion_crossbite", v)} disabled={disabled} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase text-muted-foreground">Appliances</p>
        <CheckItem label="Orthodontic" checked={!!meta.appliance_orthodontic} onToggle={(v) => set("appliance_orthodontic", v)} disabled={disabled} />
        <CheckItem label="Stayplate" checked={!!meta.appliance_stayplate} onToggle={(v) => set("appliance_stayplate", v)} disabled={disabled} />
        <Input
          placeholder="Others..."
          className="h-7 text-[11px] rounded-lg"
          value={meta.appliance_others ?? ""}
          disabled={disabled}
          onChange={(e) => set("appliance_others", e.target.value)}
        />

        <p className="text-[11px] font-bold uppercase text-muted-foreground pt-2">TMD</p>
        <CheckItem label="Clenching" checked={!!meta.tmd_clenching} onToggle={(v) => set("tmd_clenching", v)} disabled={disabled} />
        <CheckItem label="Clicking" checked={!!meta.tmd_clicking} onToggle={(v) => set("tmd_clicking", v)} disabled={disabled} />
        <CheckItem label="Trismus" checked={!!meta.tmd_trismus} onToggle={(v) => set("tmd_trismus", v)} disabled={disabled} />
        <CheckItem label="Muscle Spasm" checked={!!meta.tmd_muscle_spasm} onToggle={(v) => set("tmd_muscle_spasm", v)} disabled={disabled} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase text-muted-foreground">X-ray Taken</p>
        <div className="flex items-center gap-2">
          <CheckItem label="Periapical (Tth No.:" checked={!!meta.xray_periapical} onToggle={(v) => set("xray_periapical", v)} disabled={disabled} />
          <Input
            placeholder="#"
            className="h-7 w-16 text-[11px] rounded-lg"
            value={meta.xray_periapical_tooth_no ?? ""}
            disabled={disabled}
            onChange={(e) => set("xray_periapical_tooth_no", e.target.value)}
          />
        </div>
        <CheckItem label="Panoramic" checked={!!meta.xray_panoramic} onToggle={(v) => set("xray_panoramic", v)} disabled={disabled} />
        <CheckItem label="Cephalometric" checked={!!meta.xray_cephalometric} onToggle={(v) => set("xray_cephalometric", v)} disabled={disabled} />
        <CheckItem label="Occlusal (Upper/Lower)" checked={!!meta.xray_occlusal} onToggle={(v) => set("xray_occlusal", v)} disabled={disabled} />
        <Label className="sr-only">Others</Label>
        <Input
          placeholder="Others..."
          className="h-7 text-[11px] rounded-lg"
          value={meta.xray_others ?? ""}
          disabled={disabled}
          onChange={(e) => set("xray_others", e.target.value)}
        />
      </div>
    </div>
  );
}
