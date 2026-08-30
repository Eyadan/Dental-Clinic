"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceList } from "@/components/services/service-list";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import {
  createServiceAction,
  updateServiceAction,
  toggleServiceActiveAction,
} from "./actions";
import type { DentalService } from "@/lib/types/database";

interface ServicesClientProps {
  services: DentalService[];
}

export function ServicesClient({ services: initialServices }: ServicesClientProps) {
  const router = useRouter();
  const [services, setServices] = useState<DentalService[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<DentalService | null>(null);

  const handleCreate = () => {
    setEditingService(null);
    setDialogOpen(true);
  };

  const handleEdit = (service: DentalService) => {
    setEditingService(service);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    let result;
    if (editingService) {
      result = await updateServiceAction(editingService.id, formData);
    } else {
      result = await createServiceAction(formData);
    }

    if (result.success) {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const duration = Number(formData.get("default_duration_minutes"));
      const price = Number(formData.get("default_price"));

      if (editingService) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === editingService.id
              ? {
                  ...s,
                  name: name || s.name,
                  description: description ?? s.description,
                  default_duration_minutes: isNaN(duration) ? s.default_duration_minutes : duration,
                  default_price: isNaN(price) ? s.default_price : price,
                }
              : s,
          ),
        );
      }
      router.refresh();
    }
    return result;
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleServiceActiveAction(id, isActive);
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s)),
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Dental Services & Procedures Catalog</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {services.length} active procedures
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Manage clinic procedure offerings, durations, and pricing</p>
          </div>
        </div>

        <Button onClick={handleCreate} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add New Procedure
        </Button>
      </div>

      <ServiceList
        services={services}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
      />

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editingService}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
