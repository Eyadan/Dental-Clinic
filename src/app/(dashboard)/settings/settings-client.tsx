"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { saveSettingsAction, type SettingItem } from "./actions";

interface SettingsClientProps {
  settings: SettingItem[];
}

const CATEGORIES = [
  { key: "general", label: "Clinic", description: "Clinic information and operating hours" },
  { key: "schedule", label: "Dentist", description: "Schedules, breaks, and slot configuration" },
  { key: "booking", label: "Appointment", description: "Booking rules, grace period, approval expiration" },
  { key: "notifications", label: "Messenger", description: "Notification templates and triggers" },
  { key: "payment", label: "Payment", description: "Accepted methods and partial payment policy" },
  { key: "security", label: "Security", description: "Password policy, session timeout, audit retention" },
];

const LABEL_MAP: Record<string, string> = {
  clinic_name: "Clinic Name",
  clinic_address: "Clinic Address",
  clinic_phone: "Clinic Phone",
  clinic_email: "Clinic Email",
  operating_hours_start: "Operating Hours Start",
  operating_hours_end: "Operating Hours End",
  slot_interval_minutes: "Slot Interval (minutes)",
  booking_approval_expiration_hours: "Approval Expiration (hours)",
  confirmation_reminder_enabled: "Confirmation Reminder Enabled",
  password_min_length: "Minimum Password Length",
  password_require_uppercase: "Require Uppercase",
  password_require_lowercase: "Require Lowercase",
  password_require_numbers: "Require Numbers",
  password_require_special: "Require Special Characters",
  password_expiration_days: "Password Expiration (days)",
  max_failed_attempts: "Max Failed Login Attempts",
  lockout_duration_minutes: "Lockout Duration (minutes)",
  session_timeout_minutes: "Session Timeout (minutes)",
};

export function SettingsClient({ settings }: SettingsClientProps) {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("general");
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  const settingsByCategory = useMemo(() => {
    const grouped: Record<string, SettingItem[]> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    return grouped;
  }, [settings]);

  const currentSettings = settingsByCategory[activeCategory] ?? [];
  const hasUnsavedChanges = Object.keys(editedValues).length > 0;

  const handleCategoryChange = useCallback((category: string) => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingCategory(category);
    } else {
      setActiveCategory(category);
    }
  }, [hasUnsavedChanges]);

  const handleConfirmLeave = useCallback(() => {
    setEditedValues({});
    setShowUnsavedWarning(false);
    setActiveCategory(pendingCategory ?? activeCategory);
    setPendingCategory(null);
  }, [pendingCategory, activeCategory]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedWarning(false);
    setPendingCategory(null);
  }, []);

  const handleValueChange = useCallback((id: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const changes = Object.entries(editedValues).map(([id, value]) => ({ id, setting_value: value }));
    if (changes.length === 0) return;

    setIsSaving(true);
    const result = await saveSettingsAction(changes);
    setIsSaving(false);

    if (result.success) {
      toast.success("Settings saved", `${changes.length} setting(s) updated successfully`);
      setEditedValues({});
    } else {
      toast.error("Save failed", result.error ?? "Failed to save settings");
    }
  }, [editedValues, toast]);

  const getDisplayValue = (setting: SettingItem): string => {
    return editedValues[setting.id] ?? setting.setting_value;
  };

  const renderField = (setting: SettingItem) => {
    const label = LABEL_MAP[setting.setting_key] ?? setting.setting_key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const value = getDisplayValue(setting);

    if (setting.data_type === "boolean") {
      const checked = value === "true";
      return (
        <div key={setting.id} className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm font-medium">{label}</Label>
          <Switch
            checked={checked}
            onCheckedChange={(checked) => handleValueChange(setting.id, checked ? "true" : "false")}
          />
        </div>
      );
    }

    if (setting.data_type === "integer") {
      return (
        <div key={setting.id} className="space-y-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting.id, e.target.value)}
          />
        </div>
      );
    }

    if (setting.setting_key === "clinic_address") {
      return (
        <div key={setting.id} className="space-y-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(setting.id, e.target.value)}
            rows={2}
          />
        </div>
      );
    }

    return (
      <div key={setting.id} className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Input
          type={setting.data_type === "string" && setting.setting_key.includes("hours") ? "time" : "text"}
          value={value}
          onChange={(e) => handleValueChange(setting.id, e.target.value)}
        />
      </div>
    );
  };

  const activeCategoryInfo = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure clinic operations and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`flex w-full flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                activeCategory === cat.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="text-sm font-medium">{cat.label}</span>
              <span className="text-xs text-muted-foreground">{cat.description}</span>
            </button>
          ))}
        </nav>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activeCategoryInfo?.label}</CardTitle>
                <CardDescription>{activeCategoryInfo?.description}</CardDescription>
              </div>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Unsaved changes
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSettings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No settings configured for this category.
              </p>
            ) : (
              currentSettings.map(renderField)
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditedValues({})}
                disabled={!hasUnsavedChanges || isSaving}
              >
                Reset
              </Button>
              <Button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving}>
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Unsaved Changes
              </CardTitle>
              <CardDescription>
                You have unsaved changes in the current category. Switching will discard them.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelLeave}>Stay</Button>
              <Button variant="destructive" onClick={handleConfirmLeave}>Discard & Switch</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
