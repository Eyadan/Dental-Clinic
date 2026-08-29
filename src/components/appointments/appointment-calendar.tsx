"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";

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
  pending: "bg-blue-500",
  approved: "bg-green-500",
  confirmed: "bg-green-600",
  declined: "bg-red-500",
  cancelled: "bg-red-400",
  completed: "bg-teal-500",
  reschedule_required: "bg-yellow-500",
};

export function AppointmentCalendar({ appointments, month }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month: monthNum, daysInMonth, firstDayOfWeek, prevMonth, nextMonth } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDayOfWeek = date.getDay();

    const prevDate = new Date(y, m - 2, 1);
    const nextDate = new Date(y, m, 1);

    return {
      year: y,
      month: m,
      daysInMonth,
      firstDayOfWeek,
      prevMonth: `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`,
      nextMonth: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`,
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

  const selectedAppointments = selectedDate
    ? appointmentsByDate[selectedDate] ?? []
    : [];

  const today = new Date().toISOString().split("T")[0];
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments Calendar</h1>
          <p className="text-muted-foreground">{appointments.length} appointments this month</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/appointments?month=${prevMonth}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
          <Link href={`/appointments?month=${nextMonth}`}>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/appointments/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border">
            <div className="grid grid-cols-7 border-b">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} className="min-h-[80px] border-b border-r p-1 bg-muted/30" />;
                }

                const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayAppointments = appointmentsByDate[dateStr] ?? [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[80px] border-b border-r p-1 text-left align-top transition-colors hover:bg-accent/50 ${
                      isSelected ? "bg-accent ring-2 ring-primary ring-inset" : ""
                    } ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                      {day}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayAppointments.slice(0, 3).map((appt) => (
                        <div
                          key={appt.id}
                          className="flex items-center gap-1 text-[10px] truncate"
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              STATUS_COLORS[appt.booking_status] ?? "bg-gray-400"
                            }`}
                          />
                          <span className="truncate">{appt.scheduled_time.slice(0, 5)}</span>
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <Card>
            <CardContent className="p-4">
              {selectedDate ? (
                <div className="space-y-3">
                  <h3 className="font-medium">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-PH", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  {selectedAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No appointments on this day
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedAppointments.map((appt) => (
                        <div
                          key={appt.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {appt.patient_name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {appt.booking_status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {appt.scheduled_time.slice(0, 5)} · {appt.total_duration} min
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Ref: {appt.reference_no}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Select a date to view appointments
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
