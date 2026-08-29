"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import type { User as AppUser, Dentist } from "@/lib/types/database";

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  dentist: Dentist | null;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    appUser: null,
    dentist: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setState({ user: null, appUser: null, dentist: null, isLoading: false });
        return;
      }

      const { data: appUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      let dentist: Dentist | null = null;
      if (appUser?.role === "dentist") {
        const { data: dentistData } = await supabase
          .from("dentists")
          .select("*")
          .eq("user_id", user.id)
          .single();
        dentist = dentistData;
      }

      setState({ user, appUser, dentist, isLoading: false });
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
