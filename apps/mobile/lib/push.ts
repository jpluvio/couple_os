import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// I payload push inviati dalle Edge Function usano `data.screen`
// con il nome di uno dei tab dell'app.
const SCREENS = [
  "board",
  "calendar",
  "todo",
  "pantry",
  "finance",
  "checkin",
  "memories",
] as const;

export type PushScreen = (typeof SCREENS)[number];

export function screenFromData(data: unknown): PushScreen | null {
  if (typeof data !== "object" || data === null) return null;
  const screen = (data as { screen?: unknown }).screen;
  return SCREENS.includes(screen as PushScreen) ? (screen as PushScreen) : null;
}

function getProjectId(): string | null {
  const id =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  if (typeof id !== "string" || !id || id === "YOUR_EAS_PROJECT_ID") return null;
  return id;
}

async function currentToken(requestPermission: boolean): Promise<string | null> {
  const projectId = getProjectId();
  if (!projectId || Platform.OS === "web") return null;

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;

  if (!granted && requestPermission && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/**
 * Chiede il permesso notifiche e salva il push token del dispositivo
 * sull'utente, se non è già presente.
 */
export async function registerPushToken(userId: string): Promise<void> {
  const token = await currentToken(true);
  if (!token) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Couple OS",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#0e82ea",
    });
  }

  const { data: row } = await supabase
    .from("users")
    .select("push_tokens")
    .eq("id", userId)
    .single();

  const tokens = row?.push_tokens ?? [];
  if (tokens.includes(token)) return;

  await supabase
    .from("users")
    .update({ push_tokens: [...tokens, token] })
    .eq("id", userId);
}

/**
 * Rimuove il push token di questo dispositivo dall'utente, così che dopo il
 * logout le notifiche non continuino ad arrivare sul dispositivo.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  const token = await currentToken(false);
  if (!token) return;

  const { data: row } = await supabase
    .from("users")
    .select("push_tokens")
    .eq("id", userId)
    .single();

  const tokens = row?.push_tokens ?? [];
  if (!tokens.includes(token)) return;

  await supabase
    .from("users")
    .update({ push_tokens: tokens.filter((t) => t !== token) })
    .eq("id", userId);
}
