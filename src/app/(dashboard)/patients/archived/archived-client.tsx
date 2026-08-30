"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Archive, RotateCcw, ArchiveRestore, User } from "lucide-react";
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
        <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Archived Patient Files</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {patients.length} archived
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">View archived patient records or restore them to active directory</p>
          </div>
        </div>
      </div>

      {patients.length === 0 ? (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-16 text-center">
          <CardContent className="space-y-3 max-w-sm mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 shadow-xs">
              <ArchiveRestore className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Archived Patient Records</h3>
            <p className="text-xs text-muted-foreground">Archived patients will appear here. You can restore them to active status at any time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => {
            const fullName = `${patient.first_name} ${patient.last_name}`;
            return (
              <Card key={patient.id} className="border border-border/80 bg-card rounded-2xl shadow-xs hover:border-cyan-500/40 transition-all">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {getInitials(patient.first_name, patient.last_name)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{fullName}</p>
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-mono">
                          ID: #{patient.id.slice(0, 8).toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Phone: <span className="font-mono text-foreground font-medium">{patient.contact_no}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(patient.id, fullName)}
                    disabled={restoringId === patient.id}
                    className="h-9 rounded-xl text-xs border-border/80 hover:bg-cyan-500/10 hover:text-cyan-600 font-semibold transition-colors shrink-0"
                  >
                    {restoringId === patient.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-cyan-600" />
                    )}
                    Restore Patient Record
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
