import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Sovrascrive i valori di `extra` in app.json con le variabili d'ambiente,
 * così staging e produzione possono puntare a progetti Supabase diversi
 * senza modificare un file versionato.
 *
 * Su Vercel: Settings → Environment Variables →
 *   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * La anon key è pubblica per definizione (finisce nel bundle del client):
 * a proteggere i dati sono le policy RLS, non la segretezza della chiave.
 * La service_role key non deve MAI comparire qui.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Couple OS",
  slug: config.slug ?? "couple-os",
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? config.extra?.supabaseUrl,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? config.extra?.supabaseAnonKey,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId,
    },
  },
});
