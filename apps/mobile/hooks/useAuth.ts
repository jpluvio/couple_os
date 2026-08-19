import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/lib/push";
import type { User } from "@/types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  coupleId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carica la sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUser(session.user.id);
      else setLoading(false);
    });

    // Ascolta i cambiamenti di stato auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await loadUser(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadUser(userId: string) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    setUser(data ?? null);
    setLoading(false);
  }

  async function signOut() {
    if (user) {
      await unregisterPushToken(user.id).catch(() => {
        // Il logout non deve fallire se la rimozione del token non riesce.
      });
    }
    await supabase.auth.signOut();
  }

  return {
    session,
    user,
    coupleId: user?.couple_id ?? null,
    loading,
    signOut,
  };
}
