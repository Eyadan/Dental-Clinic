"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ChevronRight, X, Calendar } from "lucide-react";
import { getSnapshotsAction } from "@/app/(dashboard)/patients/[id]/dental-chart-actions";
import { DentalChartGrid } from "./dental-chart-grid";
import { DentalChartLegend } from "./dental-chart-legend";
import type { DentalChartSnapshot, ToothPresence, ToothFinding } from "@/lib/types/database";
import type { ToothSurface } from "@/lib/types/enums";

interface DentalChartSnapshotViewerProps {
  patientId: string;
}

export const DentalChartSnapshotViewer = memo(function DentalChartSnapshotViewer({
  patientId,
}: DentalChartSnapshotViewerProps) {
  const [snapshots, setSnapshots] = useState<DentalChartSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DentalChartSnapshot | null>(null);

  useEffect(() => {
    getSnapshotsAction(patientId).then((res) => {
      if (res.success && res.data) {
        setSnapshots(res.data);
      } else {
        setError(res.error ?? "Failed to load snapshots");
      }
      setIsLoading(false);
    });
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (selectedSnapshot) {
    const data = selectedSnapshot.snapshot_data;
    const presence = (data.presence ?? []) as ToothPresence[];
    const findings = (data.findings ?? []) as ToothFinding[];

    return (
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Camera className="h-4 w-4 text-cyan-600" /> Snapshot —{" "}
            {new Date(selectedSnapshot.created_at).toLocaleString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setSelectedSnapshot(null)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <DentalChartGrid
            presence={presence}
            findings={findings}
            selectedTooth={null}
            selectedSurfaces={new Set<ToothSurface>()}
            onToothClick={() => {}}
            onSurfaceClick={() => {}}
            showTemporary={true}
          />
          <DentalChartLegend />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Camera className="h-4 w-4 text-cyan-600" /> Visit Snapshots
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Camera className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No visit snapshots recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Snapshots are captured automatically when a consultation starts.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snapshot) => {
              const data = snapshot.snapshot_data;
              const presenceCount = data.presence?.length ?? 0;
              const findingsCount = data.findings?.length ?? 0;

              return (
                <button
                  key={snapshot.id}
                  onClick={() => setSelectedSnapshot(snapshot)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <Calendar className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {new Date(snapshot.created_at).toLocaleString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {presenceCount} teeth tracked
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {findingsCount} findings
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-600 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
