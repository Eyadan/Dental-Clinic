"use client";

import { memo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListOrdered, Clock, FileText, ArrowUpRight } from "lucide-react";

interface QueueItem {
  id: string;
  patient_id?: string;
  reference_no: string;
  scheduled_time: string;
  total_duration: number;
  visit_status: string;
  booking_status: string;
  patient_name: string;
}

interface DentistQueueClientProps {
  items: QueueItem[];
}

const VISIT_COLORS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  checked_in: { label: "Checked In", variant: "default" },
  waiting: { label: "Waiting", variant: "secondary" },
  delayed: { label: "Delayed", variant: "destructive" },
  in_consultation: { label: "In Consultation", variant: "default" },
  treatment_ongoing: { label: "Treatment Ongoing", variant: "default" },
  treatment_paused: { label: "Treatment Paused", variant: "secondary" },
};

export const DentistQueueClient = memo(function DentistQueueClient({ items }: DentistQueueClientProps) {
  const inConsultation = items.filter((i) => i.visit_status === "in_consultation" || i.visit_status === "treatment_ongoing");
  const waiting = items.filter((i) => ["checked_in", "waiting", "delayed", "treatment_paused"].includes(i.visit_status));

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Queue</h1>
        <p className="text-sm text-muted-foreground">{items.length} patient(s) in queue</p>
      </div>

      {inConsultation.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In Consultation</h2>
          {inConsultation.map((item) => {
            const badge = VISIT_COLORS[item.visit_status] ?? { label: item.visit_status, variant: "outline" as const };
            return (
              <Card key={item.id} className="border-cyan-500 shadow-xs">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{item.patient_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {item.scheduled_time}
                      </div>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  {item.patient_id && (
                    <Link href={`/patients/${item.patient_id}`} className="block pt-1">
                      <Button
                        size="sm"
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
                        style={{ minHeight: "40px" }}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Open Patient File & Chart
                        <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Waiting</h2>
        {waiting.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <ListOrdered className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No patients waiting</p>
          </div>
        ) : (
          waiting.map((item, index) => {
            const badge = VISIT_COLORS[item.visit_status] ?? { label: item.visit_status, variant: "outline" as const };
            return (
              <Card key={item.id} className="hover:border-cyan-500/50 transition-colors">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.patient_name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {item.scheduled_time}
                        </div>
                      </div>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  {item.patient_id && (
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/patients/${item.patient_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 py-1"
                        style={{ minHeight: "36px" }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View File & Chart
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
});
