import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { registerPushToken, screenFromData } from "@/lib/push";
import { useAuth } from "./useAuth";

// Le notifiche in foreground vengono mostrate come banner di sistema.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registra il push token Expo dopo il login e gestisce il deep link
 * quando l'utente apre una notifica.
 */
export function usePushNotifications(): void {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? null;
  const handledFirstResponse = useRef(false);

  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    registerPushToken(userId).catch(() => {
      // Nessun token: l'app resta usabile, le notifiche in-app continuano a funzionare.
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || Platform.OS === "web") return;

    // App aperta da una notifica mentre era chiusa.
    if (!handledFirstResponse.current) {
      handledFirstResponse.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        const screen = screenFromData(response?.notification.request.content.data);
        if (screen) router.push(`/(app)/${screen}`);
      });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const screen = screenFromData(response.notification.request.content.data);
        if (screen) router.push(`/(app)/${screen}`);
      }
    );

    return () => subscription.remove();
  }, [userId]);
}
