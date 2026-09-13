"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
  Stethoscope,
  Filter,
  Users,
  X,
} from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import { todayLocal } from "@/lib/utils/date-utils";

export interface CalendarDentistOption {
  id: string;
  name: string;
  specialization?: string | null;
}

export interface CalendarAppointment {
  id: string;
  reference_no: string;
  booking_status: string;
  scheduled_date: string;
  scheduled_time: string;
  total_duration: number;
  patient_name: string;
  dentist_id: string | null;
  dentist_name: string;
  dentist_specialization?: string | null;
}

interface AppointmentCalendarProps {
  appointments: CalendarAppointment[];
  dentists?: CalendarDentistOption[];
  month: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-cyan-600",
  confirmed: "bg-emerald-600",
  declined: "bg-red-500",
  cancelled: "bg-slate-400",
  completed: "bg-teal-600",
  reschedule_required: "bg-orange-500",
};

const STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  approved: 2,
  completed: 3,
  rescheduled: 4,
  reschedule_required: 5,
  pending_cancellation: 6,
  declined: 7,
  cancelled: 8,
};

const DENTIST_BADGE_STYLES = [
  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
];

export function AppointmentCalendar({ appointments, dentists = [], month }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDentistId, setSelectedDentistId] = useState<string>("all");

  const { year, monthNum, daysInMonth, firstDayOfWeek, prevMonth, nextMonth, monthName } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    const firstDay = date.getDay();

    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const nextDate = new Date(y, m, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

    const monthNameStr = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return {
      year: y,
      monthNum: m,
      daysInMonth: lastDay,
      firstDayOfWeek: firstDay,
      prevMonth: prevMonthStr,
      nextMonth: nextMonthStr,
      monthName: monthNameStr,
    };
  }, [month]);

  // Filter appointments by selected dentist
  const filteredAppointments = useMemo(() => {
    if (!selectedDentistId || selectedDentistId === "all") return appointments;
    return appointments.filter((a) => a.dentist_id === selectedDentistId);
  }, [appointments, selectedDentistId]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    for (const appt of filteredAppointments) {
      if (!map[appt.scheduled_date]) map[appt.scheduled_date] = [];
      map[appt.scheduled_date].push(appt);
    }
    return map;
  }, [filteredAppointments]);

  const todayStr = todayLocal();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [firstDayOfWeek, daysInMonth, year, monthNum]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const appts = appointmentsByDate[selectedDate] ?? [];
    return [...appts].sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.booking_status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.booking_status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.scheduled_time.localeCompare(b.scheduled_time);
    });
  }, [selectedDate, appointmentsByDate]);

  // Get style for a given dentist ID
  const getDentistStyle = (dentistId: string | null) => {
    if (!dentistId) return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30";
    const idx = dentists.findIndex((d) => d.id === dentistId);
    if (idx === -1) return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30";
    return DENTIST_BADGE_STYLES[idx % DENTIST_BADGE_STYLES.length];
  };

  // Compute dentist appointment counts
  const dentistCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      if (a.dentist_id) {
        counts[a.dentist_id] = (counts[a.dentist_id] || 0) + 1;
      }
    });
    return counts;
  }, [appointments]);

  const selectedDentistObj = dentists.find((d) => d.id === selectedDentistId);

  return (
    <div className="space-y-6 pb-8">
      {/* HERO BANNER WITH DENTIST FILTER */}
      <PageHeroBanner
        icon={CalendarCheck}
        title={`${monthName} Schedule`}
        description="Interactive clinic schedule calendar, multi-dentist inspector, and slot manager"
        badgeText={`${filteredAppointments.length} Appointment${filteredAppointments.length === 1 ? "" : "s"}${selectedDentistObj ? ` · ${selectedDentistObj.name}` : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* DENTIST SELECTOR DROPDOWN */}
          {dentists.length > 0 && (
            <div className="w-48 sm:w-56">
              <Select value={selectedDentistId} onValueChange={(val) => setSelectedDentistId(val ?? "all")}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-background/80 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 truncate">
                    <Stethoscope className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                    <SelectValue placeholder="All Dentists" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-semibold">
                    All Attending Dentists ({appointments.length})
                  </SelectItem>
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs font-medium">
                      {d.name} ({dentistCounts[d.id] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Link href={`/appointments?month=${prevMonth}`}>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-border/80 text-xs">
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </Button>
            </Link>
            <Link href={`/appointments?month=${nextMonth}`}>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-border/80 text-xs">
                <ChevronRight className="h-4 w-4 text-foreground" />
              </Button>
            </Link>
          </div>

          <Link href="/appointments/new">
            <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Book Appointment
            </Button>
          </Link>
        </div>
      </PageHeroBanner>

      {/* QUICK DENTIST FILTER CHIPS */}
      {dentists.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-border/60 bg-card shadow-2xs text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px] px-2 uppercase tracking-wider">
            <Filter className="h-3 w-3 text-cyan-600" /> Filter Dentist:
          </div>
          <button
            type="button"
            onClick={() => setSelectedDentistId("all")}
            className={`px-3 py-1 rounded-xl font-semibold text-xs transition-all ${
              selectedDentistId === "all"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Dentists ({appointments.length})
          </button>

          {dentists.map((d, i) => {
            const isSelected = selectedDentistId === d.id;
            const count = dentistCounts[d.id] || 0;
            const style = DENTIST_BADGE_STYLES[i % DENTIST_BADGE_STYLES.length];
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDentistId(isSelected ? "all" : d.id)}
                className={`px-3 py-1 rounded-xl font-semibold text-xs border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                    : `${style} hover:opacity-90`
                }`}
              >
                <Stethoscope className="h-3 w-3" />
                <span>{d.name}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? "bg-white/20 text-white" : "bg-background/80"}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {selectedDentistId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedDentistId("all")}
              className="ml-auto text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 px-2"
            >
              <X className="h-3 w-3" /> Clear Filter
            </button>
          )}
        </div>
      )}

      {/* CALENDAR & DAY VIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-premium p-1">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-3.5 border-b border-slate-200/80 dark:border-slate-800">
              {DAY_NAMES.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-3">
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-xl bg-slate-100/30 dark:bg-slate-900/30 border border-transparent" />;
                }

                const dayAppts = appointmentsByDate[item.dateStr] ?? [];
                const isSelected = selectedDate === item.dateStr;
                const isToday = item.dateStr === todayStr;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`h-20 sm:h-24 p-2 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30 shadow-md shadow-cyan-500/10"
                        : isToday
                          ? "border-cyan-500/60 bg-cyan-500/5 font-extrabold"
                          : "border-slate-200/70 dark:border-slate-800/70 hover:border-cyan-500/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isToday ? "text-cyan-600 font-extrabold" : "text-foreground"}`}>
                        {item.day}
                      </span>
                      {dayAppts.length > 0 && (
                        <span className="text-[10px] font-mono px-1 rounded-md bg-muted text-muted-foreground">
                          {dayAppts.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {dayAppts.slice(0, 2).map((a) => {
                        const shortDentist = a.dentist_name.startsWith("Dr. ")
                          ? a.dentist_name.replace("Dr. ", "").split(" ")[0]
                          : a.dentist_name.split(" ")[0];

                        return (
                          <div
                            key={a.id}
                            className="flex items-center gap-1 text-[10px] truncate px-1 rounded bg-muted/60"
                            title={`${a.patient_name} — ${a.dentist_name}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_COLORS[a.booking_status] ?? "bg-slate-400"}`} />
                            <span className="font-semibold text-cyan-700 dark:text-cyan-300 truncate">
                              {shortDentist}:
                            </span>
                            <span className="truncate text-foreground">{a.patient_name.split(" ")[0]}</span>
                          </div>
                        );
                      })}
                      {dayAppts.length > 2 && (
                        <span className="text-[9px] text-muted-foreground font-semibold px-1">
                          +{dayAppts.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </div>

        {/* Selected Date Details Card */}
        <Card className="border-border/60 bg-card rounded-2xl shadow-xs p-1 flex flex-col justify-between">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Select a Date"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDayAppointments.length} appointment(s)
                  {selectedDentistObj ? ` · ${selectedDentistObj.name}` : ""}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] border-border text-foreground">
                Day Schedule
              </Badge>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No appointments scheduled on this date.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {selectedDayAppointments.map((appt) => {
                  const statusTopBorder =
                    appt.booking_status === "pending" ? "border-t-4 border-t-amber-500" :
                    appt.booking_status === "approved" ? "border-t-4 border-t-emerald-500" :
                    appt.booking_status === "completed" ? "border-t-4 border-t-cyan-500" :
                    appt.booking_status === "rescheduled" ? "border-t-4 border-t-blue-500" :
                    appt.booking_status === "reschedule_required" ? "border-t-4 border-t-orange-500" :
                    appt.booking_status === "declined" || appt.booking_status === "cancelled" ? "border-t-4 border-t-red-500" : "border-t-4 border-t-slate-400";

                  const statusBadgeClass =
                    appt.booking_status === "pending" ? "border-amber-500/30 text-amber-600 bg-amber-500/10" :
                    appt.booking_status === "approved" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" :
                    appt.booking_status === "completed" ? "border-cyan-500/30 text-cyan-600 bg-cyan-500/10" :
                    appt.booking_status === "rescheduled" ? "border-blue-500/30 text-blue-600 bg-blue-500/10" :
                    appt.booking_status === "reschedule_required" ? "border-orange-500/30 text-orange-600 bg-orange-500/10" :
                    appt.booking_status === "declined" || appt.booking_status === "cancelled" ? "border-red-500/30 text-red-600 bg-red-500/10" : "border-slate-500/30 text-slate-600 bg-slate-500/10";

                  const dentistBadgeStyle = getDentistStyle(appt.dentist_id);

                  return (
                    <div key={appt.id} className={`p-3 rounded-xl border border-border/60 bg-card space-y-2 hover:border-cyan-500/40 transition-all ${statusTopBorder}`}>
                      {/* PATIENT NAME & TIME */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-cyan-600 shrink-0" /> {appt.patient_name}
                        </span>
                        <span className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded-lg font-semibold text-foreground">{appt.scheduled_time.slice(0, 5)}</span>
                      </div>

                      {/* ASSIGNED DENTIST BADGE */}
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] font-medium flex items-center gap-1 border ${dentistBadgeStyle}`}>
                          <Stethoscope className="h-3 w-3 shrink-0" />
                          <span>{appt.dentist_name}</span>
                          {appt.dentist_specialization && (
                            <span className="opacity-70 font-normal">· {appt.dentist_specialization}</span>
                          )}
                        </Badge>
                      </div>

                      {/* REF & STATUS */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 border-t border-border/40">
                        <span className="font-mono text-[10px]">Ref: {appt.reference_no}</span>
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold border ${statusBadgeClass}`}>
                          {appt.booking_status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
