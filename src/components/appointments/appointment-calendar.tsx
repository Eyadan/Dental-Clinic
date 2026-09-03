"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon, User, Sparkles, CalendarCheck } from "lucide-react";
import { todayLocal } from "@/lib/utils/date-utils";

interface CalendarAppointment {
  id: string;
  reference_no: string;
  booking_status: string;
  scheduled_date: string;
  scheduled_time: string;
  total_duration: number;
  patient_name: string;
}

interface AppointmentCalendarProps {
  appointments: CalendarAppointment[];
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

export function AppointmentCalendar({ appointments, month }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    for (const appt of appointments) {
      if (!map[appt.scheduled_date]) map[appt.scheduled_date] = [];
      map[appt.scheduled_date].push(appt);
    }
    return map;
  }, [appointments]);

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

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{monthName} Schedule</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {appointments.length} appointments
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Interactive clinic schedule calendar and day view</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/appointments?month=${prevMonth}`}>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-border/60 hover:bg-muted/50 active:scale-95 transition-all">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/appointments?month=${nextMonth}`}>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-border/60 hover:bg-muted/50 active:scale-95 transition-all">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/appointments/new">
            <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* CALENDAR & DAY VIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 bg-card rounded-2xl shadow-xs p-1">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground pb-3 border-b border-border/40">
              {DAY_NAMES.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-3">
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-xl bg-muted/10 border border-transparent" />;
                }

                const dayAppts = appointmentsByDate[item.dateStr] ?? [];
                const isSelected = selectedDate === item.dateStr;
                const isToday = item.dateStr === todayStr;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`h-20 sm:h-24 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? "border-cyan-600 bg-cyan-500/5 ring-2 ring-cyan-600/30"
                        : isToday
                          ? "border-cyan-500/50 bg-cyan-500/5 font-bold"
                          : "border-border/40 hover:border-cyan-500/30 hover:bg-muted/30"
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
                      {dayAppts.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-1 text-[10px] truncate px-1 rounded bg-muted/60"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_COLORS[a.booking_status] ?? "bg-slate-400"}`} />
                          <span className="truncate">{a.patient_name.split(" ")[0]}</span>
                        </div>
                      ))}
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
        </Card>

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
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {selectedDayAppointments.map((appt) => {
                  const statusLeftBorder =
                    appt.booking_status === "pending" ? "border-l-4 border-l-amber-500" :
                    appt.booking_status === "approved" ? "border-l-4 border-l-emerald-500" :
                    appt.booking_status === "completed" ? "border-l-4 border-l-cyan-500" :
                    appt.booking_status === "rescheduled" ? "border-l-4 border-l-blue-500" :
                    appt.booking_status === "reschedule_required" ? "border-l-4 border-l-orange-500" :
                    appt.booking_status === "declined" || appt.booking_status === "cancelled" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-slate-400";

                  const statusBadgeClass =
                    appt.booking_status === "pending" ? "border-amber-500/30 text-amber-600 bg-amber-500/10" :
                    appt.booking_status === "approved" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" :
                    appt.booking_status === "completed" ? "border-cyan-500/30 text-cyan-600 bg-cyan-500/10" :
                    appt.booking_status === "rescheduled" ? "border-blue-500/30 text-blue-600 bg-blue-500/10" :
                    appt.booking_status === "reschedule_required" ? "border-orange-500/30 text-orange-600 bg-orange-500/10" :
                    appt.booking_status === "declined" || appt.booking_status === "cancelled" ? "border-red-500/30 text-red-600 bg-red-500/10" : "border-slate-500/30 text-slate-600 bg-slate-500/10";

                  return (
                    <div key={appt.id} className={`p-3 rounded-xl border border-border/60 bg-card space-y-1.5 hover:border-cyan-500/40 transition-all ${statusLeftBorder}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-cyan-600" /> {appt.patient_name}
                        </span>
                        <span className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded-lg font-semibold text-foreground">{appt.scheduled_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
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
