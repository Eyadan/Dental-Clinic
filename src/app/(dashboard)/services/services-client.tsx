"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ServicesClient({ services }: ServicesClientProps) {
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
    if (editingService) {
      return updateServiceAction(editingService.id, formData);
    }
    return createServiceAction(formData);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleServiceActiveAction(id, isActive);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dental Services</h1>
          <p className="text-muted-foreground">
            Manage your clinic&apos;s service catalog
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Service
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
