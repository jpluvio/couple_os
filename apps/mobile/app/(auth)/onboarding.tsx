import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

type Mode = "choose" | "create" | "join";

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
      // RPC atomica: crea coppia + associa utente + genera codice invito,
      // bypassando il problema RLS del read-back lato client.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("create_couple", {
        couple_name: coupleName.trim() || null,
      });

      if (error) throw error;

      setCreatedCode(data.invite_code as string);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossibile creare la coppia. Riprova.";
      showAlert("Errore", msg);
    } finally {
      setLoading(false);
    }
  }

  async function joinCouple() {
    const code = inviteCode.trim().toUpperCase();
    // I codici emessi prima dell'hardening erano di 6 caratteri, i nuovi di 10.
    if (code.length < 6 || code.length > 10) {
      showAlert("Codice non valido", "Controlla il codice e riprova.");
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("join_couple_by_code", {
        invite_code: code,
      });

      if (error) throw error;

      // La funzione restituisce null sul codice non valido: sollevare
      // un'eccezione lato DB annullerebbe il conteggio dei tentativi.
      if (!data) {
        showAlert("Codice non valido", "Il codice non esiste, è scaduto o è già stato usato.");
        return;
      }

      router.replace("/(app)/oggi");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Codice non valido o scaduto.";
      showAlert("Errore", msg);
    } finally {
      setLoading(false);
    }
  }

  // Schermata di successo: mostra il codice invito da condividere col partner.
  if (createdCode) {
    return (
      <View className="flex-1 bg-card items-center justify-center px-8">
        <Text className="text-3xl font-bold text-ink mb-2">Coppia creata! 🎉</Text>
        <Text className="text-base text-muted text-center mb-8">
          Condividi questo codice con il tuo partner. Valido per 48 ore.
        </Text>

        <View className="bg-hair rounded-card px-8 py-5 mb-10">
          <Text className="text-3xl font-bold tracking-[8px] text-ink text-center">
            {createdCode}
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace("/(app)/oggi")}
          className="w-full bg-brand-500 rounded-card py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Continua</Text>
        </Pressable>
      </View>
    );
  }

  if (mode === "choose") {
    return (
      <View className="flex-1 bg-card items-center justify-center px-8">
        <Text className="text-3xl font-bold text-ink mb-2">Benvenuto/a!</Text>
        <Text className="text-base text-muted text-center mb-12">
          Crea una nuova coppia oppure unisciti a quella del tuo partner.
        </Text>

        <Pressable
          onPress={() => setMode("create")}
          className="w-full bg-brand-500 rounded-card py-4 items-center mb-4 active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Crea una coppia</Text>
        </Pressable>

        <Pressable
          onPress={() => setMode("join")}
          className="w-full border border-line rounded-card py-4 items-center active:opacity-70"
        >
          <Text className="text-ink font-semibold text-base">Ho un codice invito</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-card"
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
            <Text className="text-2xl font-bold text-ink mb-2">Nuova coppia</Text>
            <Text className="text-sm text-muted text-center mb-8">
              Dai un nome alla vostra coppia (opzionale).
            </Text>

            <TextInput
              value={coupleName}
              onChangeText={setCoupleName}
              placeholder="es. Paolo & Sara"
              placeholderTextColor="#a49a8e"
              className="w-full border border-line rounded-card px-4 py-3 text-base text-ink mb-6"
              maxLength={50}
            />

            <Pressable
              onPress={createCouple}
              disabled={loading}
              className="w-full bg-brand-500 rounded-card py-4 items-center active:opacity-80"
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
            <Text className="text-2xl font-bold text-ink mb-2">Unisciti</Text>
            <Text className="text-sm text-muted text-center mb-8">
              Inserisci il codice invito ricevuto dal tuo partner.
            </Text>

            <TextInput
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#a49a8e"
              autoCapitalize="characters"
              className="w-full border border-line rounded-card px-4 py-3 text-base text-ink text-center tracking-widest mb-6"
              maxLength={10}
            />

            <Pressable
              onPress={joinCouple}
              disabled={loading}
              className="w-full bg-brand-500 rounded-card py-4 items-center active:opacity-80"
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
