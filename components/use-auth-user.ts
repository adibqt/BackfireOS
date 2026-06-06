"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuthUser() {
  const configured = isSupabaseAuthConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  return { user, loading, configured };
}

export async function signOutUser() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
