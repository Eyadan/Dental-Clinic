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
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import { createPatientAction, updatePatientAction, archivePatientAction, getPatientMedicalDetailsAction } from "./actions";
import { MoreHorizontal, Pencil, Archive, UserPlus, Eye, Users, Phone, Mail, AlertTriangle, ArrowUpRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Patient, MedicalCondition, PatientMedicalRecord } from "@/lib/types/database";

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
  const [editingMedicalRecord, setEditingMedicalRecord] = useState<PatientMedicalRecord | null>(null);
  const [editingConditionIds, setEditingConditionIds] = useState<string[]>([]);
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
    setEditingMedicalRecord(null);
    setEditingConditionIds([]);
    setDialogOpen(true);
  };

  const handleEdit = async (patient: Patient) => {
    setEditingPatient(patient);
    setEditingMedicalRecord(null);
    setEditingConditionIds([]);

    const res = await getPatientMedicalDetailsAction(patient.id);
    if (res.success && res.data) {
      setEditingMedicalRecord(res.data.medicalRecord);
      setEditingConditionIds(res.data.conditionIds);
    }

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
    <div className="space-y-6 pb-8">
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={Users}
        title="Patient Records Directory"
        description="Demographics, medical alerts, clinical visit logs, and dental chart archives"
        badgeText={`${totalCount} Active Patient File${totalCount === 1 ? "" : "s"}`}
      >
        <Button onClick={handleCreate} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Register New Patient
        </Button>
      </PageHeroBanner>

      {/* Search Input */}
      <PatientSearch onSearch={handleSearch} isLoading={isLoading} />

      {/* Responsive Patient Display: Mobile Cards (<lg) + Desktop Table (lg+) */}
      
      {/* Mobile Card List (<lg) */}
      <div className="block lg:hidden space-y-3">
        {patients.length === 0 ? (
          <Card className="border border-dashed border-border/80 bg-card rounded-2xl">
            <CardContent className="p-8 text-center space-y-2">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No Patients Found</p>
              <p className="text-xs text-muted-foreground">
                No patient records match your current search query.
              </p>
            </CardContent>
          </Card>
        ) : (
          patients.map((patient) => {
            const age = calculateAge(patient.birth_date);
            const allergyList = parseAllergies(patient.allergies);
            const hasAllergies = allergyList.length > 0;

            return (
              <Card
                key={patient.id}
                className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header: Avatar + Name + Dropdown */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(patient.first_name, patient.last_name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-bold text-sm text-foreground hover:text-cyan-600 transition-colors block truncate"
                        >
                          {patient.first_name} {patient.last_name}
                        </Link>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          ID: #{patient.id.slice(0, 8).toUpperCase()}
                          {age !== null && ` · ${age} yrs old`}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="h-10 w-10 p-0 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label={`Actions for ${patient.first_name} ${patient.last_name}`}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => handleEdit(patient)} className="text-xs py-2.5">
                          <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> Edit Demographics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(patient.id)} className="text-xs py-2.5 text-destructive">
                          <Archive className="mr-2 h-4 w-4" /> Archive Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Contact Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5 border-t border-border/40">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Contact</span>
                      <a
                        href={`tel:${patient.contact_no}`}
                        className="flex items-center gap-1.5 font-semibold text-cyan-600 dark:text-cyan-400 hover:underline mt-0.5"
                        style={{ minHeight: "32px" }}
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {patient.contact_no}
                      </a>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Birth Date</span>
                      <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                        {formatDate(patient.birth_date)}
                      </p>
                    </div>
                  </div>

                  {patient.email && (
                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Email</span>
                      <a
                        href={`mailto:${patient.email}`}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors truncate mt-0.5"
                        style={{ minHeight: "28px" }}
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {patient.email}
                      </a>
                    </div>
                  )}

                  {/* Medical Alerts */}
                  <div className="pt-0.5">
                    {hasAllergies ? (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          Allergies ({allergyList.length}):
                        </span>
                        {allergyList.map((allergy, idx) => (
                          <Badge key={idx} variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/20 text-[10px] font-bold">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>No known medical allergies</span>
                      </div>
                    )}
                  </div>

                  {/* Primary CTA */}
                  <div className="pt-1">
                    <Link href={`/patients/${patient.id}`} className="block">
                      <Button
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                        style={{ minHeight: "44px" }}
                      >
                        <Eye className="h-4 w-4" />
                        View Patient File & Dental Chart
                        <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Table View (lg+) */}
      <div className="hidden lg:block card-premium overflow-hidden">
        <CardContent className="p-0">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/70">
                <TableHead className="w-[22%] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5 px-3 uppercase tracking-wider">Patient Details</TableHead>
                <TableHead className="w-[22%] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5 px-3 uppercase tracking-wider">Contact Details</TableHead>
                <TableHead className="w-[16%] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5 px-2 uppercase tracking-wider">Birth Date & Age</TableHead>
                <TableHead className="w-[26%] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5 px-3 uppercase tracking-wider">Medical Conditions & Allergies</TableHead>
                <TableHead className="w-[14%] text-right text-xs font-bold text-slate-700 dark:text-slate-300 pr-3 py-3.5 uppercase tracking-wider">Actions</TableHead>
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
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {getInitials(patient.first_name, patient.last_name)}
                          </div>
                          <div className="min-w-0 flex-1 truncate">
                            <Link href={`/patients/${patient.id}`} className="font-bold text-xs text-foreground hover:text-cyan-600 transition-colors block truncate">
                              {patient.first_name} {patient.last_name}
                            </Link>
                            <span className="text-[10px] font-mono text-muted-foreground block truncate">ID: #{patient.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground py-3 px-3">
                        <div className="space-y-1 min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-foreground truncate">
                            <Phone className="h-3 w-3 text-cyan-600 shrink-0" />
                            <span className="truncate">{patient.contact_no}</span>
                          </p>
                          {patient.email && (
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{patient.email}</span>
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground py-3 px-2 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-foreground">{formatDate(patient.birth_date)}</p>
                          {age !== null && (
                            <span className="text-[10px] text-muted-foreground font-mono">{age} yrs old</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground py-3 px-3 whitespace-normal">
                        {(() => {
                          const allergyList = parseAllergies(patient.allergies);
                          return allergyList.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {allergyList.map((allergy, idx) => (
                                <Badge key={idx} variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold py-0 px-1.5 whitespace-nowrap">
                                  <AlertTriangle className="mr-0.5 h-2.5 w-2.5 shrink-0" /> {allergy}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-medium py-0 px-1.5 whitespace-nowrap">
                              <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600 shrink-0" /> No Known Allergies
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      <TableCell className="text-right pr-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/patients/${patient.id}`} title="View Profile">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl border-border/80 text-xs hover:bg-cyan-500/10 hover:text-cyan-600 transition-colors px-2 xl:px-3"
                              aria-label={`View profile of ${patient.first_name} ${patient.last_name}`}
                            >
                              <span className="hidden xl:inline mr-1">View Profile</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              aria-label={`More options for ${patient.first_name} ${patient.last_name}`}
                            >
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
      </div>

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        medicalRecord={editingMedicalRecord}
        conditionIds={editingConditionIds}
        conditions={conditions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
