import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { Database } from "@/types/database";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || supabaseUrl === "SUPABASE_URL_PLACEHOLDER") {
  console.warn(
    "Supabase URL non configurata. Aggiorna extra.supabaseUrl in app.json."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE su tutte le piattaforme: il redirect torna con `?code=` nella query
    // invece dei token nel fragment. Serve perché il ramo nativo del login
    // chiama `exchangeCodeForSession`, che con il flow implicito (il default di
    // supabase-js) non troverebbe mai un code da scambiare.
    flowType: "pkce",
    // Volutamente disattivato anche sul web. Se acceso, `_getSessionFromURL`
    // parte dentro al costruttore del client — cioè all'import del modulo — e
    // la sua `window.history.replaceState` raggiunge il listener di linking di
    // expo-router prima che il navigator sia montato, dove `routeNames` è
    // ancora undefined e l'app si schianta con
    // "undefined is not an object (evaluating 'rootState?.routeNames.includes')".
    // Lo scambio del code lo fa `useOAuthCallback`, dopo il mount.
    detectSessionInUrl: false,
  },
});
