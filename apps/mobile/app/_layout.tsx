import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, asyncStoragePersister } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";

function AuthGuard() {
  const { session, loading } = useAuth();
  const exchangingCode = useOAuthCallback();
  usePushNotifications();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Durante lo scambio del code OAuth la sessione non c'è ancora: rimbalzare
    // ora manderebbe l'utente al login proprio mentre sta finendo di accedere.
    if (loading || exchangingCode) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onOnboarding = segments.includes("onboarding");

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup && !onOnboarding) {
      // Utente autenticato: vai alla board, ma lascialo libero
      // sulla schermata di onboarding (crea/unisciti a una coppia).
      router.replace("/(app)/board");
    }
  }, [session, loading, exchangingCode, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <AuthProvider>
            <AuthGuard />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
