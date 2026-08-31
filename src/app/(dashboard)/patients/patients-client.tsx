"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAllergies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { MoreHorizontal, Pencil, Archive, UserPlus, Eye, Users, Phone, Mail, AlertTriangle, ArrowUpRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Patient, MedicalCondition } from "@/lib/types/database";

interface PatientsClientProps {
  initialPatients: Patient[];
  totalCount: number;
  conditions: MedicalCondition[];
}

export function PatientsClient({ initialPatients, totalCount, conditions }: PatientsClientProps) {
  const router = useRouter();
  const [patients, setPatients] = useState(initialPatients);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [, startTransition] = useTransition();

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setPatients(initialPatients);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setPatients(data.patients ?? []);
      }
    } catch {
      // Keep existing patients on error
    } finally {
      setIsLoading(false);
    }
  }, [initialPatients]);

  const handleCreate = () => {
    setEditingPatient(null);
    setDialogOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    let result;
    if (editingPatient) {
      result = await updatePatientAction(editingPatient.id, formData);
    } else {
      result = await createPatientAction(formData);
    }

    if (result.success) {
      const updatedFirstName = formData.get("first_name") as string;
      const updatedLastName = formData.get("last_name") as string;
      const updatedContact = formData.get("contact_no") as string;
      const updatedEmail = formData.get("email") as string;
      const updatedBirthDate = formData.get("birth_date") as string;
      const updatedMedical = formData.get("medical_history") as string;
      const updatedAllergies = formData.get("allergies") as string;

      if (editingPatient) {
        setPatients((prev) =>
          prev.map((p) =>
            p.id === editingPatient.id
              ? {
                  ...p,
                  first_name: updatedFirstName || p.first_name,
                  last_name: updatedLastName || p.last_name,
                  contact_no: updatedContact || p.contact_no,
                  email: updatedEmail || null,
                  birth_date: updatedBirthDate || null,
                  medical_history: updatedMedical || null,
                  allergies: updatedAllergies || null,
                }
              : p,
          ),
        );
      }
      router.refresh();
    }
    return result;
  };

  const handleArchive = (id: string) => {
    startTransition(async () => {
      await archivePatientAction(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  };

  const calculateAge = (birthDateStr?: string | null) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Patient Records Directory</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {totalCount} registered
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Manage patient demographics, medical history, and clinical records</p>
          </div>
        </div>

        <Button onClick={handleCreate} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Register New Patient
        </Button>
      </div>

      {/* Search Input */}
      <PatientSearch onSearch={handleSearch} isLoading={isLoading} />

      {/* Patients Table Container */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-bold text-muted-foreground py-3.5">Patient Details</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground py-3.5">Contact Details</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground py-3.5">Birth Date & Age</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground py-3.5">Medical Conditions & Allergies</TableHead>
                <TableHead className="text-right text-xs font-bold text-muted-foreground pr-4 py-3.5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                    No patients found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => {
                  const age = calculateAge(patient.birth_date);
                  const hasAllergies = patient.allergies && patient.allergies.toLowerCase() !== "none";

                  return (
                    <TableRow key={patient.id} className="border-b border-border/40 hover:bg-cyan-500/5 transition-colors group">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {getInitials(patient.first_name, patient.last_name)}
                          </div>
                          <div>
                            <Link href={`/patients/${patient.id}`} className="font-bold text-xs text-foreground hover:text-cyan-600 transition-colors block">
                              {patient.first_name} {patient.last_name}
                            </Link>
                            <span className="text-[10px] font-mono text-muted-foreground">ID: #{patient.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground py-3">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 font-medium text-foreground">
                            <Phone className="h-3 w-3 text-cyan-600 shrink-0" /> {patient.contact_no}
                          </p>
                          {patient.email && (
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" /> {patient.email}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground py-3">
                        <div>
                          <p className="font-semibold text-foreground">{formatDate(patient.birth_date)}</p>
                          {age !== null && (
                            <span className="text-[10px] text-muted-foreground font-mono">{age} yrs old</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground py-3">
                        {(() => {
                          const allergyList = parseAllergies(patient.allergies);
                          return allergyList.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {allergyList.map((allergy, idx) => (
                                <Badge key={idx} variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold">
                                  <AlertTriangle className="mr-1 h-3 w-3 shrink-0" /> {allergy}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-medium">
                              <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600 shrink-0" /> No Known Allergies
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      <TableCell className="text-right pr-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/patients/${patient.id}`}>
                            <Button size="sm" variant="outline" className="h-8 rounded-xl border-border/80 text-xs hover:bg-cyan-500/10 hover:text-cyan-600 transition-colors">
                              View Profile <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                              <DropdownMenuItem onClick={() => handleEdit(patient)} className="text-xs">
                                <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Edit Demographics
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(patient.id)} className="text-xs text-destructive">
                                <Archive className="mr-2 h-3.5 w-3.5" /> Archive Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        conditions={conditions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
