"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, FileSignature } from "lucide-react";

export interface ConsentListItem {
  consentId: string;
  patientName: string;
  treatmentInfo: string;
  consentVersion: string;
  signedAt: string | null;
  createdAt: string;
}

interface ConsentListClientProps {
  items: ConsentListItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MOCK_CONSENTS: ConsentListItem[] = [
  {
    consentId: "demo-consent-1",
    patientName: "Ana Patricia Lim",
    treatmentInfo: "Tooth Extraction & Local Anesthesia Waiver",
    consentVersion: "1.0",
    signedAt: "2026-09-03T10:35:00Z",
    createdAt: "2026-09-03T10:30:00Z",
  },
  {
    consentId: "demo-consent-2",
    patientName: "Maria Clara Santos",
    treatmentInfo: "Orthodontic Bracket Installation & Care Protocol",
    consentVersion: "1.0",
    signedAt: null,
    createdAt: "2026-09-03T11:00:00Z",
  },
];

export function ConsentListClient({ items }: ConsentListClientProps) {
  const effectiveItems = items.length > 0 ? items : MOCK_CONSENTS;

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Patient Consent Desk</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {effectiveItems.length} forms
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">View, manage, and verify digital consent waivers</p>
          </div>
        </div>
      </div>

      {effectiveItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSignature className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No consent forms have been created yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-sm font-bold">
              Consent Forms Registry ({effectiveItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Treatment</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveItems.map((item) => (
                    <tr
                      key={item.consentId}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/consent/${item.consentId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.patientName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                        {item.treatmentInfo}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        v{item.consentVersion}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {item.signedAt ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <FileCheck className="mr-1 h-3 w-3" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
