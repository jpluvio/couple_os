import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Platform } from "react-native";
import { showAlert } from "@/lib/alert";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { coupleId } = useAuth();

  async function signInWithGoogle() {
    setLoading(true);
    try {
      // Web: redirect a pagina intera; al ritorno è `useOAuthCallback` a scambiare il code.
      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        });
        if (error) throw error;
        return; // la pagina viene reindirizzata a Google
      }

      const redirectTo = makeRedirectUri({ scheme: "couple-os", path: "auth/callback" });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success") {
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          // AuthGuard in _layout.tsx gestisce il redirect
        }
      }
    } catch (err) {
      showAlert("Errore", "Accesso con Google non riuscito. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-card items-center justify-center px-8">
      {/* Logo / Branding */}
      <View className="mb-16 items-center">
        <Text className="text-5xl mb-3">💑</Text>
        <Text className="text-3xl font-bold text-ink tracking-tight">Couple OS</Text>
        <Text className="text-base text-muted mt-2 text-center">
          Il vostro spazio condiviso
        </Text>
      </View>

      {/* Login button */}
      <Pressable
        onPress={signInWithGoogle}
        disabled={loading}
        className="w-full bg-card border border-line rounded-card py-4 px-6 flex-row items-center justify-center shadow-sm active:opacity-70"
      >
        {loading ? (
          <ActivityIndicator color="#a8562e" />
        ) : (
          <>
            <Text className="text-xl mr-3">G</Text>
            <Text className="text-base font-semibold text-ink">
              Continua con Google
            </Text>
          </>
        )}
      </Pressable>

      <Text className="text-xs text-soft mt-8 text-center px-4">
        Accedendo accetti che i tuoi dati siano visibili solo al tuo partner.
      </Text>
    </View>
  );
}
