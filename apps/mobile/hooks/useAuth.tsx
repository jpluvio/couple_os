import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

const AuthContext = createContext<AuthState | null>(null);

/**
 * Stato di autenticazione condiviso da tutta l'app.
 *
 * Deve esistere una sola istanza. Prima `useAuth` era un hook con stato
 * locale, chiamato da 18 componenti (più `useCouple`, che a sua volta lo
 * chiama): ognuno lanciava il proprio `getSession()` e registrava la propria
 * `onAuthStateChange`. `getSession()` prende un lock esclusivo per origine
 * (`lock:sb-<ref>-auth-token`, Web Locks API), quindi con i tab di
 * expo-router montati insieme una dozzina di richieste si contendevano lo
 * stesso lock. Chi lo teneva oltre il timeout se lo vedeva rubare da un
 * altro richiedente, e l'app moriva con
 * "Lock ... was released because another request stole it".
 *
 * Con un provider solo la sessione si legge una volta e la sottoscrizione
 * è una: nessuna contesa.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let attivo = true;

    async function loadUser(userId: string) {
      const { data } = await supabase.from("users").select("*").eq("id", userId).single();
      if (!attivo) return;
      setUser(data ?? null);
      setLoading(false);
    }

    // Nessun `getSession()`: `onAuthStateChange` emette già `INITIAL_SESSION`
    // con la sessione riletta da localStorage, e `getSession()` costerebbe una
    // seconda acquisizione dello stesso lock esclusivo senza aggiungere nulla.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
      if (!attivo) return;

      // All'avvio, se la rilettura della sessione fallisce, auth-js emette
      // comunque INITIAL_SESSION con `null`: indistinguibile da un logout, ma
      // il token potrebbe essere ancora in storage. Invece di buttare fuori
      // l'utente si riprova una volta prima di dichiararlo disconnesso.
      if (evento === "INITIAL_SESSION" && !session) {
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (!attivo) return;
            setSession(data.session);
            if (data.session) loadUser(data.session.user.id);
            else setLoading(false);
          })
          .catch((err) => {
            console.warn("[auth] rilettura della sessione fallita:", err?.message ?? err);
            if (attivo) setLoading(false);
          });
        return;
      }

      setSession(session);
      if (session) {
        loadUser(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      attivo = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      coupleId: user?.couple_id ?? null,
      loading,
      signOut: async () => {
        if (user) {
          await unregisterPushToken(user.id).catch(() => {
            // Il logout non deve fallire se la rimozione del token non riesce.
          });
        }
        await supabase.auth.signOut();
      },
    }),
    [session, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth richiede <AuthProvider> più in alto nell'albero.");
  return ctx;
}
