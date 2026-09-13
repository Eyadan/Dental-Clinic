"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Eye, EyeOff, ShieldCheck, UserCheck, Stethoscope } from "lucide-react";

interface LoginFormProps {
  redirectUrl: string;
}

const DEV_ACCOUNTS = [
  { role: "Admin", email: "admin@clinic.local", pass: "AdminPass123!", icon: ShieldCheck },
  { role: "Reception", email: "reception@clinic.local", pass: "ReceptionPass123!", icon: UserCheck },
  { role: "Dentist 1", email: "dentist@clinic.local", pass: "DentistPass123!", icon: Stethoscope },
  { role: "Dentist 2", email: "dentist2@clinic.local", pass: "Dentist2Pass123!", icon: Stethoscope },
];

export function LoginForm({ redirectUrl }: LoginFormProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setAuthError(error.message);
        setIsSubmitting(false);
        return;
      }

      window.location.href = redirectUrl;
    } catch {
      setAuthError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white px-4 py-8 overflow-hidden">
      {/* GLOWING BACKGROUND ORBS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
        <CardHeader className="space-y-3 text-center pb-4 pt-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-lg shadow-cyan-500/20">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Smile Dental Clinic
            </CardTitle>
            <CardDescription className="text-xs text-slate-300 mt-1 font-medium">
              Enterprise Medical SaaS Staff Portal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-6 pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <Alert variant="destructive" className="rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-300">
                <AlertDescription className="text-xs font-medium">{authError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Staff Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@clinic.local"
                autoComplete="email"
                className="h-10 border-slate-700 bg-slate-950/80 text-white focus-visible:ring-cyan-500 rounded-xl text-xs"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs font-medium text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="h-10 pr-10 border-slate-700 bg-slate-950/80 text-white focus-visible:ring-cyan-500 rounded-xl text-xs"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-rose-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Authenticating..." : "Sign In to Clinic Workspace"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900 px-2 text-slate-400 font-bold tracking-wider">Quick Demo Logins</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEV_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email, acc.pass)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <Icon className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-white leading-none">{acc.role}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{acc.email.split("@")[0]}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
