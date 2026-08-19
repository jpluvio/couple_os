import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
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
      // Web: full-page redirect; on return detectSessionInUrl handles the code.
      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        });
        if (error) throw error;
        return; // the page is redirected to Google
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
          // The AuthGuard in _layout.tsx handles the redirect
        }
      }
    } catch (err) {
      Alert.alert("Sign-in failed", "Could not sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      {/* Logo / Branding */}
      <View className="mb-16 items-center">
        <Text className="text-5xl mb-3">💑</Text>
        <Text className="text-3xl font-bold text-gray-900 tracking-tight">Couple OS</Text>
        <Text className="text-base text-gray-500 mt-2 text-center">
          Your shared space
        </Text>
      </View>

      {/* Login button */}
      <Pressable
        onPress={signInWithGoogle}
        disabled={loading}
        className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-6 flex-row items-center justify-center shadow-sm active:opacity-70"
      >
        {loading ? (
          <ActivityIndicator color="#0e82ea" />
        ) : (
          <>
            <Text className="text-xl mr-3">G</Text>
            <Text className="text-base font-semibold text-gray-800">
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>

      <Text className="text-xs text-gray-400 mt-8 text-center px-4">
        By signing in, your data stays visible to your partner only.
      </Text>
    </View>
  );
}
