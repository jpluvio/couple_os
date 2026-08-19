import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

type Mode = "choose" | "create" | "join";

// Alert.alert is a no-op on react-native-web: use window.alert there.
function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>("choose");
  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const router = useRouter();

  async function createCouple() {
    setLoading(true);
    try {
      // Atomic RPC: create the couple, attach the user and generate the
      // invite code, sidestepping the client-side read-back RLS problem.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("create_couple", {
        couple_name: coupleName.trim() || null,
      });

      if (error) throw error;

      setCreatedCode(data.invite_code as string);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create the couple. Please try again.";
      notify("Something went wrong", msg);
    } finally {
      setLoading(false);
    }
  }

  async function joinCouple() {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      notify("Invalid code", "The invite code is 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("join_couple_by_code", {
        invite_code: code,
      });

      if (error) throw error;

      router.replace("/(app)/board");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "That code is invalid or has expired.";
      notify("Something went wrong", msg);
    } finally {
      setLoading(false);
    }
  }

  // Success screen: show the invite code to share with the partner.
  if (createdCode) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">You're all set! 🎉</Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Share this code with your partner. It works for 48 hours.
        </Text>

        <View className="bg-gray-100 rounded-2xl px-8 py-5 mb-10">
          <Text className="text-3xl font-bold tracking-[8px] text-gray-900 text-center">
            {createdCode}
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace("/(app)/board")}
          className="w-full bg-brand-500 rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Continue</Text>
        </Pressable>
      </View>
    );
  }

  if (mode === "choose") {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome!</Text>
        <Text className="text-base text-gray-500 text-center mb-12">
          Create a new couple, or join the one your partner set up.
        </Text>

        <Pressable
          onPress={() => setMode("create")}
          className="w-full bg-brand-500 rounded-2xl py-4 items-center mb-4 active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Create a couple</Text>
        </Pressable>

        <Pressable
          onPress={() => setMode("join")}
          className="w-full border border-gray-200 rounded-2xl py-4 items-center active:opacity-70"
        >
          <Text className="text-gray-700 font-semibold text-base">I have an invite code</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerClassName="flex-1 items-center justify-center px-8"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setMode("choose")}
          className="self-start mb-8"
        >
          <Text className="text-brand-500 text-base">← Back</Text>
        </Pressable>

        {mode === "create" ? (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-2">New couple</Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              Give your couple a name (optional).
            </Text>

            <TextInput
              value={coupleName}
              onChangeText={setCoupleName}
              placeholder="e.g. Paolo & Sara"
              placeholderTextColor="#9ca3af"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-6"
              maxLength={50}
            />

            <Pressable
              onPress={createCouple}
              disabled={loading}
              className="w-full bg-brand-500 rounded-2xl py-4 items-center active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Create</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Join</Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              Enter the invite code your partner sent you.
            </Text>

            <TextInput
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 text-center tracking-widest mb-6"
              maxLength={6}
            />

            <Pressable
              onPress={joinCouple}
              disabled={loading}
              className="w-full bg-brand-500 rounded-2xl py-4 items-center active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Join</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
