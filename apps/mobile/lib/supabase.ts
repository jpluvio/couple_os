import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Database } from "@/types/database";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || supabaseUrl === "SUPABASE_URL_PLACEHOLDER") {
  console.warn(
    "Supabase URL is not configured. Update extra.supabaseUrl in app.json."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, Supabase must process the `?code=` in the URL when OAuth returns.
    detectSessionInUrl: Platform.OS === "web",
  },
});
