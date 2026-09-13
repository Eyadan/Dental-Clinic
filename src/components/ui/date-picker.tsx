"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, parseISO, isValid, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (dateStr: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  showPresets?: boolean;
  align?: "left" | "right";
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  maxDate,
  disabled = false,
  className = "",
  id,
  showPresets = true,
  align = "left",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;
  const [currentMonth, setCurrentMonth] = useState<Date>(parsedDate || new Date());

  useEffect(() => {
    if (parsedDate) {
      setCurrentMonth(parsedDate);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDate = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    onChange?.(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  const handleApplyPreset = (daysToAdd: number) => {
    const targetDate = addDays(new Date(), daysToAdd);
    handleSelectDate(targetDate);
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Starting offset for day of week (0 = Sun, 1 = Mon, etc.)
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({ length: startDayOfWeek });

  const formattedDisplay = parsedDate
    ? format(parsedDate, "MMM d, yyyy")
    : null;

  const alignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* TRIGGER BUTTON */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 flex items-center justify-between rounded-xl border text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
          isOpen
            ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-background shadow-xs"
            : "border-border/80 bg-background hover:border-cyan-500/50 hover:bg-muted/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
            parsedDate ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"
          }`}>
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <span className={`truncate ${parsedDate ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
            {formattedDisplay || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {parsedDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </div>
      </button>

      {/* POPOVER CALENDAR DROPDOWN */}
      {isOpen && (
        <div className={`absolute ${alignClass} top-full mt-2 z-50 w-72 rounded-2xl border border-border/80 bg-popover p-4 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95`}>
          {/* MONTH HEADER NAVIGATION */}
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <span className="font-bold text-xs text-foreground font-mono uppercase tracking-wider">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                onClick={() => setCurrentMonth(addDays(monthStart, -1))}
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                onClick={() => setCurrentMonth(addDays(monthEnd, 1))}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* DAY NAMES HEADER */}
          <div className="grid grid-cols-7 gap-1 pt-3 text-center text-[10px] font-bold text-muted-foreground">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* CALENDAR DAYS GRID */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="h-7" />
            ))}
            {daysInMonth.map((day) => {
              const formattedDateStr = format(day, "yyyy-MM-dd");
              const isSelected = parsedDate ? isSameDay(day, parsedDate) : false;
              const isCurrentDay = isToday(day);
              const isDisabled = Boolean(
                (minDate && formattedDateStr < minDate) ||
                (maxDate && formattedDateStr > maxDate)
              );

              return (
                <button
                  key={formattedDateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(day)}
                  className={`h-7 rounded-lg text-xs font-semibold transition-all flex items-center justify-center relative ${
                    isSelected
                      ? "bg-cyan-600 text-white shadow-xs"
                      : isCurrentDay
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/30"
                      : "text-foreground hover:bg-muted/60"
                  } ${isDisabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* QUICK PRESETS */}
          {showPresets && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Quick Presets</span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(0)}
                  className="px-2 py-1 rounded-lg border border-border/60 bg-muted/20 hover:bg-cyan-500/10 hover:text-cyan-600 hover:border-cyan-500/30 transition-colors font-medium text-center"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(1)}
                  className="px-2 py-1 rounded-lg border border-border/60 bg-muted/20 hover:bg-cyan-500/10 hover:text-cyan-600 hover:border-cyan-500/30 transition-colors font-medium text-center"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(7)}
                  className="px-2 py-1 rounded-lg border border-border/60 bg-muted/20 hover:bg-cyan-500/10 hover:text-cyan-600 hover:border-cyan-500/30 transition-colors font-medium text-center"
                >
                  +1 Week
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
