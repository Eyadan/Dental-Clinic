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
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
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
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={Layers}
        title="Dental Services & Pricing Catalog"
        description="Manage clinical procedures, expected durations, and pricing schedules"
        badgeText={`${services.length} Procedures`}
      >
        <Button onClick={handleCreate} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add New Procedure
        </Button>
      </PageHeroBanner>

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
