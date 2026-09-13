"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
  value?: string; // HH:mm format (e.g., "09:00" or "14:30")
  onChange?: (timeStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  align?: "left" | "right";
  stepMinutes?: number; // 15 or 30
  startHour?: number; // 0 to 23
  endHour?: number; // 0 to 23
}

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const hFormatted = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${hFormatted}:${mStr || "00"} ${ampm}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  className = "",
  id,
  align = "left",
  stepMinutes = 30,
  startHour = 0,
  endHour = 23,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate full day time slots (12:00 AM to 11:30 PM)
  const timeOptions: { value: string; label: string }[] = [];

  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hStr = h < 10 ? `0${h}` : `${h}`;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      const val24 = `${hStr}:${mStr}`;
      timeOptions.push({
        value: val24,
        label: format12Hour(val24),
      });
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTime = (val: string) => {
    onChange?.(val);
    setIsOpen(false);
  };

  const alignClass = align === "right" ? "right-0" : "left-0";
  const displayLabel = value ? format12Hour(value) : null;

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
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
            value ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"
          }`}>
            <Clock className="h-3.5 w-3.5" />
          </div>
          <span className={`truncate font-mono ${value ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
            {displayLabel || placeholder}
          </span>
        </div>

        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div className={`absolute ${alignClass} top-full mt-2 z-50 w-48 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-popover p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95`}>
          <div className="space-y-0.5">
            {timeOptions.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectTime(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold font-mono transition-all ${
                    isSelected
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "text-foreground hover:bg-cyan-500/10 hover:text-cyan-600"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
