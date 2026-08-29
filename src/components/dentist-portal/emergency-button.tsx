"use client";

import { useRef, useState, useCallback } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyButtonProps {
  onActivate: () => Promise<void>;
}

const LONG_PRESS_DURATION = 1500;

export function EmergencyButton({ onActivate }: EmergencyButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const activatedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(() => {
    activatedRef.current = false;
    startTimeRef.current = Date.now();
    setIsPressing(true);
    setProgress(0);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= LONG_PRESS_DURATION && !activatedRef.current) {
        activatedRef.current = true;
        clearTimer();
        setIsPressing(false);
        setProgress(0);
        setIsActivating(true);

        onActivate().finally(() => {
          setIsActivating(false);
        });
      }
    }, 50);
  }, [clearTimer, onActivate]);

  const handleEnd = useCallback(() => {
    if (!activatedRef.current) {
      clearTimer();
      setIsPressing(false);
      setProgress(0);
    }
  }, [clearTimer]);

  const handleCancel = useCallback(() => {
    clearTimer();
    setIsPressing(false);
    setProgress(0);
    setIsActivating(false);
  }, [clearTimer]);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onPointerDown={handleStart}
        onPointerUp={handleEnd}
        onPointerLeave={handleEnd}
        onPointerCancel={handleEnd}
        disabled={isActivating}
        className={cn(
          "relative flex h-48 w-48 touch-none select-none items-center justify-center rounded-full border-4 transition-all",
          isPressing
            ? "border-red-600 bg-red-600/20 scale-105"
            : "border-red-500 bg-red-50",
          isActivating && "opacity-50",
        )}
        style={{ minHeight: "192px", minWidth: "192px" }}
        aria-label="Emergency declaration — long press to activate"
      >
        {isActivating ? (
          <Loader2 className="h-12 w-12 animate-spin text-red-600" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-12 w-12 transition-colors",
                isPressing ? "text-red-600" : "text-red-500",
              )}
            />
            <span className={cn(
              "text-center text-sm font-bold",
              isPressing ? "text-red-600" : "text-red-500",
            )}>
              {isPressing ? "HOLD TO ACTIVATE" : "EMERGENCY"}
            </span>
          </div>
        )}

        {isPressing && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 192 192"
            style={{ width: "100%", height: "100%" }}
          >
            <circle
              cx="96"
              cy="96"
              r="92"
              fill="none"
              stroke="rgb(220 38 38)"
              strokeWidth="4"
              strokeDasharray={`${(progress / 100) * 578} 578`}
              className="transition-all duration-75"
            />
          </svg>
        )}
      </button>

      <p className="max-w-xs text-center text-sm text-muted-foreground">
        {isPressing
          ? "Keep holding for 1.5 seconds to trigger emergency"
          : isActivating
            ? "Activating emergency protocol..."
            : "Long-press the button for 1.5 seconds to declare an emergency. This will trigger the reassignment workflow for your patients."}
      </p>

      {isActivating && (
        <button
          onClick={handleCancel}
          className="text-sm text-muted-foreground underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
