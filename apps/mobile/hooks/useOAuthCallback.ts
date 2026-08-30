import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Completa il login OAuth sul web scambiando il `?code=` del redirect.
 *
 * Questo lavoro lo farebbe `detectSessionInUrl`, ma quello parte dentro al
 * costruttore del client Supabase — all'import del modulo — e la `replaceState`
 * con cui ripulisce l'URL arriva al listener di linking di expo-router quando il
 * navigator non è ancora montato, facendo esplodere l'app. Qui invece siamo
 * dentro un effect: il navigator esiste già e la stessa `replaceState` è innocua.
 *
 * Ritorna `true` finché lo scambio è in corso, così l'AuthGuard non rimbalza
 * l'utente sul login mentre la sessione sta per arrivare.
 */
export function useOAuthCallback() {
  const [pending, setPending] = useState(
    () => Platform.OS === "web" && hasAuthParams()
  );

  useEffect(() => {
    if (Platform.OS !== "web" || !hasAuthParams()) return;

    let cancelled = false;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorDescription = url.searchParams.get("error_description");

    (async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn("[auth] scambio del code fallito:", error.message);
        } else if (errorDescription) {
          console.warn("[auth] il provider ha risposto con un errore:", errorDescription);
        }
      } catch (err) {
        // Es. un lock dell'auth rubato: l'utente resta sul login, l'app non muore.
        console.warn("[auth] callback OAuth fallita:", (err as Error)?.message ?? err);
      } finally {
        if (!cancelled) {
          cleanUrl();
          setPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return pending;
}

function hasAuthParams() {
  if (typeof window === "undefined") return false;
  const params = new URL(window.location.href).searchParams;
  return params.has("code") || params.has("error_description");
}

/** Toglie dall'URL i parametri dell'OAuth, lasciando intatto il resto. */
function cleanUrl() {
  const url = new URL(window.location.href);
  for (const key of ["code", "state", "error", "error_description"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", url.toString());
}
