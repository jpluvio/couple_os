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

export default function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>("choose");
  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function createCouple() {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Utente non trovato");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      // Crea la coppia
      const { data: couple, error: coupleError } = await sb
        .from("couples")
        .insert({ name: coupleName.trim() || null })
        .select()
        .single();

      if (coupleError || !couple) throw coupleError ?? new Error("Errore creazione coppia");

      // Associa l'utente alla coppia
      const { error: userError } = await sb
        .from("users")
        .update({ couple_id: couple.id })
        .eq("id", user.id);

      if (userError) throw userError;

      // Genera codice invito (6 caratteri, 48h)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await sb.from("invite_codes").insert({
        code,
        couple_id: couple.id,
        expires_at: expiresAt,
      });

      Alert.alert(
        "Coppia creata! 🎉",
        `Condividi questo codice con il tuo partner:\n\n${code}\n\nValido per 48 ore.`,
        [{ text: "Continua", onPress: () => router.replace("/(app)/board") }]
      );
    } catch (err) {
      Alert.alert("Errore", "Impossibile creare la coppia. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function joinCouple() {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert("Codice non valido", "Il codice deve essere di 6 caratteri.");
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
      const msg = err instanceof Error ? err.message : "Codice non valido o scaduto.";
      Alert.alert("Errore", msg);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "choose") {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Benvenuto/a!</Text>
        <Text className="text-base text-gray-500 text-center mb-12">
          Crea una nuova coppia oppure unisciti a quella del tuo partner.
        </Text>

        <Pressable
          onPress={() => setMode("create")}
          className="w-full bg-brand-500 rounded-2xl py-4 items-center mb-4 active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Crea una coppia</Text>
        </Pressable>

        <Pressable
          onPress={() => setMode("join")}
          className="w-full border border-gray-200 rounded-2xl py-4 items-center active:opacity-70"
        >
          <Text className="text-gray-700 font-semibold text-base">Ho un codice invito</Text>
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
          <Text className="text-brand-500 text-base">← Indietro</Text>
        </Pressable>

        {mode === "create" ? (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Nuova coppia</Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              Dai un nome alla vostra coppia (opzionale).
            </Text>

            <TextInput
              value={coupleName}
              onChangeText={setCoupleName}
              placeholder="es. Paolo & Sara"
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
                <Text className="text-white font-semibold text-base">Crea</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Unisciti</Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              Inserisci il codice invito ricevuto dal tuo partner.
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
                <Text className="text-white font-semibold text-base">Unisciti</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
