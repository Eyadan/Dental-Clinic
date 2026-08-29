"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { createPatientAction, updatePatientAction, archivePatientAction } from "./actions";
import { MoreHorizontal, Pencil, Archive, UserPlus, Eye } from "lucide-react";
import type { Patient } from "@/lib/types/database";

interface PatientsClientProps {
  initialPatients: Patient[];
  totalCount: number;
}

export function PatientsClient({ initialPatients, totalCount }: PatientsClientProps) {
  const router = useRouter();
  const [patients, setPatients] = useState(initialPatients);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [, startTransition] = useTransition();

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    router.push(url.pathname + (query ? `?q=${encodeURIComponent(query)}` : ""));
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleCreate = () => {
    setEditingPatient(null);
    setDialogOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    if (editingPatient) {
      return updatePatientAction(editingPatient.id, formData);
    }
    return createPatientAction(formData);
  };

  const handleArchive = async (id: string) => {
    await archivePatientAction(id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            {totalCount} {totalCount === 1 ? "patient" : "patients"} registered
          </p>
        </div>
        <Button onClick={handleCreate}>
          <UserPlus className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>

      <PatientSearch onSearch={handleSearch} isLoading={isLoading} />

      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No patients found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or register a new patient.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    {patient.first_name} {patient.last_name}
                  </TableCell>
                  <TableCell>{patient.contact_no}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={patient.is_archived ? "secondary" : "default"}>
                      {patient.is_archived ? "Archived" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={<Link href={`/patients/${patient.id}`}>View Details</Link>}
                        />
                        <DropdownMenuItem onClick={() => handleEdit(patient)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleArchive(patient.id)}
                          className="text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
