import type { ToothSurface } from "@/lib/types/enums";
import type { ToothFinding } from "@/lib/types/database";
import { getFindingCode, getFindingColor, SURFACE_LABELS, getPresenceColor, getPresenceCode } from "./tooth-legend";
import { hexFromBg, hexFromBorder } from "./tooth-color-map";

const DEFAULT_COLOR = "bg-white border-slate-200 text-slate-400";

interface ToothIconProps {
  number: number;
  findings: ToothFinding[];
  presence: string | null;
  selectedSurfaces: Set<ToothSurface>;
  onSurfaceClick: (surface: ToothSurface) => void;
  small?: boolean;
}

interface SegmentPath {
  surface: ToothSurface;
  d: string;
  label: string;
}

function getSurfaceFindings(findings: ToothFinding[], surface: ToothSurface): ToothFinding[] {
  return findings.filter((f) => {
    if (f.finding_surfaces && f.finding_surfaces.length > 0) {
      return f.finding_surfaces.some((fs) => fs.surface === surface);
    }
    // Finding without specific surfaces applies to the whole tooth
    return true;
  });
}

function getDominantColor(findings: ToothFinding[], surface: ToothSurface): string {
  const surfaceFindings = getSurfaceFindings(findings, surface);
  if (surfaceFindings.length === 0) return DEFAULT_COLOR;
  const sorted = [...surfaceFindings].sort((a, b) => {
    const order: Record<string, number> = { surgery: 0, restoration: 1, condition: 2 };
    return (order[a.category] ?? 3) - (order[b.category] ?? 3);
  });
  return getFindingColor(sorted[0].category, sorted[0].code, DEFAULT_COLOR);
}

export function ToothIcon({ number, findings, presence, selectedSurfaces, onSurfaceClick, small }: ToothIconProps) {
  const size = small ? 28 : 42;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = small ? 11 : 17;
  const innerR = small ? 5 : 7.5;

  const top = { x: cx, y: cy - outerR };
  const right = { x: cx + outerR, y: cy };
  const bottom = { x: cx, y: cy + outerR };
  const left = { x: cx - outerR, y: cy };

  const segments: SegmentPath[] = [
    {
      surface: "buccal",
      label: SURFACE_LABELS.buccal.abbr,
      d: `M ${cx} ${cy} L ${left.x} ${left.y} A ${outerR} ${outerR} 0 0 1 ${top.x} ${top.y} Z`,
    },
    {
      surface: "distal",
      label: SURFACE_LABELS.distal.abbr,
      d: `M ${cx} ${cy} L ${top.x} ${top.y} A ${outerR} ${outerR} 0 0 1 ${right.x} ${right.y} Z`,
    },
    {
      surface: "lingual",
      label: SURFACE_LABELS.lingual.abbr,
      d: `M ${cx} ${cy} L ${right.x} ${right.y} A ${outerR} ${outerR} 0 0 1 ${bottom.x} ${bottom.y} Z`,
    },
    {
      surface: "mesial",
      label: SURFACE_LABELS.mesial.abbr,
      d: `M ${cx} ${cy} L ${bottom.x} ${bottom.y} A ${outerR} ${outerR} 0 0 1 ${left.x} ${left.y} Z`,
    },
  ];

  const presenceColor = presence ? getPresenceColor(presence as never) : null;
  const ringStroke = presenceColor ? hexFromBorder(presenceColor) : "#cbd5e1";
  const ringFill = presenceColor ? hexFromBg(presenceColor) : "white";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
      role="img"
      aria-label={`Tooth ${number} diagram with 5 tappable surfaces`}
    >
      <circle cx={cx} cy={cy} r={outerR} fill={ringFill} stroke={ringStroke} strokeWidth={presence && presence !== "present" ? 2 : 1} />
      {segments.map(({ surface, d }) => {
        const colorClass = getDominantColor(findings, surface);
        const fillHex = hexFromBg(colorClass);
        const strokeHex = hexFromBorder(colorClass);
        const isSelected = selectedSurfaces.has(surface);
        const surfaceFindings = getSurfaceFindings(findings, surface);

        return (
          <path
            key={surface}
            d={d}
            fill={fillHex}
            stroke={strokeHex}
            strokeWidth={1.2}
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(surface);
            }}
            style={{
              filter: isSelected ? "drop-shadow(0 0 2px #06b6d4)" : undefined,
            }}
          />
        );
      })}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill={hexFromBg(getDominantColor(findings, "occlusal"))}
        stroke={hexFromBorder(getDominantColor(findings, "occlusal"))}
        strokeWidth={1.2}
        className="cursor-pointer transition-all hover:opacity-80"
        onClick={(e) => {
          e.stopPropagation();
          onSurfaceClick("occlusal");
        }}
        style={{
          filter: selectedSurfaces.has("occlusal") ? "drop-shadow(0 0 2px #06b6d4)" : undefined,
        }}
      />
      {segments.map(({ surface }) => {
        const surfaceFindings = getSurfaceFindings(findings, surface);
        if (surfaceFindings.length === 0) return null;
        // Only show text label on peripheral segment if finding was specifically targeted to this surface
        const specificCodes = surfaceFindings
          .filter((f) => f.finding_surfaces && f.finding_surfaces.length > 0)
          .map((f) => getFindingCode(f.category, f.code))
          .filter(Boolean);
        if (specificCodes.length === 0) return null;
        const angle =
          surface === "buccal" ? -90 : surface === "distal" ? 0 : surface === "lingual" ? 90 : 180;
        const rad = (angle * Math.PI) / 180;
        const labelR = outerR * 0.62;
        const x = cx + Math.cos(rad) * labelR;
        const y = cy + Math.sin(rad) * labelR;
        return (
          <text
            key={`label-${surface}`}
            x={x}
            y={y + (small ? 2.5 : 3.5)}
            textAnchor="middle"
            fontSize={small ? 5 : 7}
            fontWeight="bold"
            fill={hexFromBorder(getDominantColor(findings, surface))}
            className="pointer-events-none select-none"
          >
            {specificCodes.join("/")}
          </text>
        );
      })}
      {(() => {
        const occlusalFindings = getSurfaceFindings(findings, "occlusal");
        const codes = occlusalFindings.map((f) => getFindingCode(f.category, f.code)).filter(Boolean);
        const presenceCode =
          codes.length === 0 && presence && presence !== "present"
            ? getPresenceCode(presence as never)
            : null;

        if (codes.length === 0 && !presenceCode) return null;

        const text = codes.length > 0 ? codes.slice(0, 2).join("/") : presenceCode;
        const fill = codes.length > 0
          ? hexFromBorder(getDominantColor(findings, "occlusal"))
          : hexFromBorder(presenceColor ?? "border-slate-500");

        return (
          <text
            x={cx}
            y={cy + (small ? 2.5 : 3.5)}
            textAnchor="middle"
            fontSize={small ? 5 : 7}
            fontWeight="bold"
            fill={fill}
            className="pointer-events-none select-none"
          >
            {text}
          </text>
        );
      })()}
    </svg>
  );
}
