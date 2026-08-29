"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    loading: (title: string) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: ReactNode; className: string }
> = {
  success: {
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    className: "border-green-200 bg-green-50",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-destructive" />,
    className: "border-destructive/30 bg-destructive/5",
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" />,
    className: "border-blue-200 bg-blue-50",
  },
  loading: {
    icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
    className: "border-border bg-background",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      if (toast.variant !== "loading") {
        const duration = toast.duration ?? 4000;
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast],
  );

  const toast = {
    success: (title: string, description?: string) =>
      addToast({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      addToast({ title, description, variant: "error" }),
    info: (title: string, description?: string) =>
      addToast({ title, description, variant: "info" }),
    loading: (title: string) =>
      addToast({ title, variant: "loading" }),
    dismiss: (id: string) => removeToast(id),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const config = VARIANT_CONFIG[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right-full",
                config.className,
              )}
            >
              {config.icon}
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              {t.variant !== "loading" && (
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx.toast;
}
