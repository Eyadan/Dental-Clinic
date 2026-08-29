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

export function ConsentListClient({ items }: ConsentListClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consent Forms</h1>
        <p className="text-sm text-muted-foreground">
          View and manage patient consent forms
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSignature className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No consent forms have been created yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Consent Forms ({items.length})
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
                  {items.map((item) => (
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
