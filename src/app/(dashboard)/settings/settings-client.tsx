"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, AlertTriangle, Building2, Clock, CalendarCheck, Bell, CreditCard, ShieldCheck, CheckCircle2, RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { saveSettingsAction, type SettingItem } from "./actions";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";

interface SettingsClientProps {
  settings: SettingItem[];
}

const CATEGORIES = [
  { key: "general", label: "Clinic Profile", description: "Clinic info & address", icon: Building2 },
  { key: "schedule", label: "Operating Hours", description: "Schedule & time slots", icon: Clock },
  { key: "booking", label: "Booking Rules", description: "Approval & grace period", icon: CalendarCheck },
  { key: "notifications", label: "Messenger Bot", description: "Notification triggers", icon: Bell },
  { key: "payment", label: "Payment Policy", description: "Methods & partial payments", icon: CreditCard },
  { key: "security", label: "Security Policy", description: "Password complexity & timeouts", icon: ShieldCheck },
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

  const activeCategoryMeta = CATEGORIES.find((c) => c.key === activeCategory) ?? CATEGORIES[0];
  const activeSettings = settingsByCategory[activeCategory] ?? [];
  const ActiveIcon = activeCategoryMeta.icon;

  const renderField = (setting: SettingItem) => {
    const label = LABEL_MAP[setting.setting_key] ?? setting.setting_key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const value = getDisplayValue(setting);

    if (setting.data_type === "boolean") {
      const checked = value === "true";
      return (
        <div key={setting.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5">
          <Label className="text-xs font-semibold">{label}</Label>
          <Switch
            checked={checked}
            onCheckedChange={(checked) => handleValueChange(setting.id, checked ? "true" : "false")}
          />
        </div>
      );
    }

    if (setting.data_type === "integer") {
      return (
        <div key={setting.id} className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting.id, e.target.value)}
            className="h-10 text-xs border-border/60 focus-visible:ring-cyan-500 rounded-xl"
          />
        </div>
      );
    }

    if (setting.setting_key === "clinic_address") {
      return (
        <div key={setting.id} className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(setting.id, e.target.value)}
            rows={2}
            className="text-xs border-border/60 focus-visible:ring-cyan-500 rounded-xl"
          />
        </div>
      );
    }

    return (
      <div key={setting.id} className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        <Input
          type={setting.data_type === "string" && setting.setting_key.includes("hours") ? "time" : "text"}
          value={value}
          onChange={(e) => handleValueChange(setting.id, e.target.value)}
          className="h-10 text-xs border-border/60 focus-visible:ring-cyan-500 rounded-xl"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={SettingsIcon}
        title="Clinic System Settings"
        description="Configure clinic profile, operating schedule, and security policies"
        badgeText="Admin Control"
      >
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-300 bg-amber-500/10 gap-1 text-xs font-semibold">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              {Object.keys(editedValues).length} unsaved
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditedValues({})}
            disabled={!hasUnsavedChanges || isSaving}
            className="rounded-xl border-border/80 text-xs h-9"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-xs rounded-xl text-xs h-9"
          >
            {isSaving ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes</>
            )}
          </Button>
        </div>
      </PageHeroBanner>

      {/* CATEGORY TABS & PANEL */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Category Side Navigation */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryChange(cat.key)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-card border-cyan-500/50 text-foreground font-bold shadow-md border-l-4 border-l-cyan-500"
                    : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isActive ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{cat.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{cat.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Category Content Card */}
        <Card className="flex-1 card-premium">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">{activeCategoryMeta.label}</CardTitle>
                <CardDescription className="text-xs">{activeCategoryMeta.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {activeSettings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">No settings configured in this category.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeSettings.map(renderField)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-md border-rose-500/30 bg-slate-950 text-white rounded-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-400 text-base font-bold">
                <AlertTriangle className="h-5 w-5" />
                Unsaved Changes
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                You have unsaved edits in your settings. Switching categories will discard these changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCancelLeave} className="rounded-xl text-xs border-slate-700 bg-slate-900 text-slate-200">Stay & Edit</Button>
              <Button variant="destructive" size="sm" onClick={handleConfirmLeave} className="rounded-xl text-xs bg-rose-600 hover:bg-rose-500">Discard & Switch</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
