"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Archive, RotateCcw, ArchiveRestore } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getArchivedPatientsAction, unarchivePatientAction } from "@/app/(dashboard)/patients/archive-actions";
import { useToast } from "@/components/ui/toast";

interface ArchivedPatient {
  id: string;
  first_name: string;
  last_name: string;
  contact_no: string;
  archived_at: string;
}

export function ArchivedRecordsClient() {
  const [patients, setPatients] = useState<ArchivedPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const toast = useToast();

  const fetchArchived = () => {
    setIsLoading(true);
    getArchivedPatientsAction().then((res) => {
      if (res.success && res.data) {
        setPatients(res.data);
      } else {
        setError(res.error ?? "Failed to load archived records");
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleRestore = async (patientId: string, name: string) => {
    setRestoringId(patientId);
    const res = await unarchivePatientAction(patientId);
    setRestoringId(null);
    if (res.success) {
      toast.success("Patient restored", `${name} has been unarchived and is now active`);
      fetchArchived();
    } else {
      toast.error("Restore failed", res.error ?? "Failed to restore patient");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Archived Records</h1>
        <p className="text-muted-foreground">View and restore archived patient records</p>
      </div>

      {patients.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No archived records"
          description="Archived patients will appear here. You can restore them at any time."
        />
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => {
            const fullName = `${patient.first_name} ${patient.last_name}`;
            return (
              <Card key={patient.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{fullName}</p>
                      <Badge variant="secondary">
                        <Archive className="mr-1 h-3 w-3" />
                        Archived
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {patient.contact_no} · Archived on {new Date(patient.archived_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(patient.id, fullName)}
                    disabled={restoringId === patient.id}
                  >
                    {restoringId === patient.id ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restoring...</>
                    ) : (
                      <><RotateCcw className="mr-2 h-4 w-4" /> Restore</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
