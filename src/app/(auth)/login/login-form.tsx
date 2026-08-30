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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border-border/60 shadow-xs rounded-2xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-xs">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Smile Dental Clinic
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Sign in to your staff portal account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5">
                <AlertDescription className="text-xs font-medium">{authError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@clinic.local"
                autoComplete="email"
                className="h-10 border-border/60 focus-visible:ring-cyan-500 rounded-xl text-xs"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="h-10 pr-10 border-border/60 focus-visible:ring-cyan-500 rounded-xl text-xs"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs rounded-xl shadow-xs"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-card px-2 text-muted-foreground font-semibold">Quick Test Login</span>
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
                  className="flex items-center gap-2 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 text-left transition-all"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold leading-none">{acc.role}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{acc.email.split("@")[0]}</p>
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
