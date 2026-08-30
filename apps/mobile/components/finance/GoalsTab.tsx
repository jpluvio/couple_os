import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCouple } from "@/hooks/useCouple";
import type { FinancialGoal } from "@/types/database";

function ProgressBar({ ratio }: { ratio: number }) {
  const clamped = Math.min(ratio, 1);
  const color = ratio >= 1 ? "#10b981" : ratio > 0.6 ? "#3b82f6" : "#6366f1";
  return (
    <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-2">
      <View className="h-full rounded-full" style={{ width: `${clamped * 100}%`, backgroundColor: color }} />
    </View>
  );
}

export function GoalsTab() {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";
  const qKey = ["financial-goals", coupleId];

  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState<FinancialGoal | null>(null);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [updateAmount, setUpdateAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: goals, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at");
      if (error) throw error;
      return data as FinancialGoal[];
    },
  });

  async function addGoal() {
    if (!title.trim() || !targetAmount.trim() || !coupleId) return;
    const target = parseFloat(targetAmount.replace(",", "."));
    const saved = savedAmount ? parseFloat(savedAmount.replace(",", ".")) : 0;
    if (isNaN(target) || target <= 0) {
      showAlert("Errore", "Inserisci un importo target valido.");
      return;
    }
    setLoading(true);
    try {
      await supabase.from("financial_goals").insert({
        title: title.trim(),
        target_amount: target,
        saved_amount: saved,
        couple_id: coupleId,
      });
      queryClient.invalidateQueries({ queryKey: qKey });
      resetForm();
      setShowAdd(false);
    } catch {
      showAlert("Errore", "Impossibile aggiungere l'obiettivo.");
    } finally {
      setLoading(false);
    }
  }

  async function updateSaved() {
    if (!showUpdate || !updateAmount.trim()) return;
    const amount = parseFloat(updateAmount.replace(",", "."));
    if (isNaN(amount) || amount < 0) {
      showAlert("Errore", "Inserisci un importo valido.");
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from("financial_goals")
        .update({ saved_amount: amount })
        .eq("id", showUpdate.id);
      queryClient.invalidateQueries({ queryKey: qKey });
      setShowUpdate(null);
      setUpdateAmount("");
    } catch {
      showAlert("Errore", "Impossibile aggiornare l'obiettivo.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setTargetAmount("");
    setSavedAmount("");
  }

  function handleLongPress(goal: FinancialGoal) {
    showAlert(goal.title, undefined, [
      {
        text: "🗑️ Elimina",
        style: "destructive",
        onPress: async () => {
          await supabase.from("financial_goals").delete().eq("id", goal.id);
          queryClient.invalidateQueries({ queryKey: qKey });
        },
      },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />
        }
      >
        {(!goals || goals.length === 0) && !isLoading ? (
          <View className="items-center py-20 px-8">
            <Text className="text-5xl mb-4">🎯</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">Nessun obiettivo</Text>
            <Text className="text-sm text-gray-400 text-center mt-1">
              Crea il vostro primo obiettivo finanziario di coppia!
            </Text>
          </View>
        ) : (
          goals?.map((goal) => {
            const ratio = goal.target_amount > 0 ? goal.saved_amount / goal.target_amount : 0;
            const pct = Math.min(ratio * 100, 100).toFixed(0);
            const done = goal.saved_amount >= goal.target_amount;

            return (
              <Pressable
                key={goal.id}
                onPress={() => { setShowUpdate(goal); setUpdateAmount(String(goal.saved_amount)); }}
                onLongPress={() => handleLongPress(goal)}
                className="bg-white mx-4 mb-3 rounded-2xl px-4 py-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1" style={{ gap: 2 }}>
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      {done && <Text>✅</Text>}
                      <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                        {goal.title}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400">
                      Tocca per aggiornare · tieni premuto per eliminare
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-emerald-600 ml-3">{pct}%</Text>
                </View>

                <ProgressBar ratio={ratio} />

                <View className="flex-row justify-between mt-2">
                  <Text className="text-sm text-gray-600">
                    Risparmiati: <Text className="font-semibold">€{goal.saved_amount.toFixed(0)}</Text>
                  </Text>
                  <Text className="text-sm text-gray-400">
                    Obiettivo: €{goal.target_amount.toFixed(0)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => { resetForm(); setShowAdd(true); }}
        className="absolute bottom-8 right-6 w-14 h-14 bg-emerald-500 rounded-full items-center justify-center"
        style={{ shadowColor: "#10b981", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
      >
        <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>+</Text>
      </Pressable>

      {/* Add goal modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { resetForm(); setShowAdd(false); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => { resetForm(); setShowAdd(false); }} className="py-1 px-2">
              <Text className="text-base text-gray-500">Annulla</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">Nuovo obiettivo</Text>
            <Pressable
              onPress={addGoal}
              disabled={!title.trim() || !targetAmount.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${title.trim() && targetAmount.trim() && !loading ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${title.trim() && targetAmount.trim() ? "text-white" : "text-gray-400"}`}>
                  Crea
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 20 }}>
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nome obiettivo</Text>
              <TextInput
                className="text-lg text-gray-900 border-b border-gray-100 pb-2"
                placeholder="es. Vacanza in Giappone"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Importo target (€)</Text>
              <TextInput
                className="text-3xl font-bold text-gray-900 border-b border-gray-100 pb-2"
                placeholder="0"
                placeholderTextColor="#d1d5db"
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Già risparmiati (€)</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                value={savedAmount}
                onChangeText={setSavedAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Update saved amount modal */}
      <Modal
        visible={!!showUpdate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowUpdate(null); setUpdateAmount(""); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => { setShowUpdate(null); setUpdateAmount(""); }} className="py-1 px-2">
              <Text className="text-base text-gray-500">Annulla</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {showUpdate?.title}
            </Text>
            <Pressable
              onPress={updateSaved}
              disabled={!updateAmount.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${updateAmount.trim() && !loading ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${updateAmount.trim() ? "text-white" : "text-gray-400"}`}>Salva</Text>
              )}
            </Pressable>
          </View>

          <View className="px-4 pt-6" style={{ gap: 8 }}>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Totale risparmiato (€)
            </Text>
            <TextInput
              className="text-4xl font-bold text-gray-900 border-b border-gray-100 pb-3"
              placeholder="0"
              placeholderTextColor="#d1d5db"
              value={updateAmount}
              onChangeText={setUpdateAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            {showUpdate && (
              <Text className="text-sm text-gray-400">
                Obiettivo: €{showUpdate.target_amount.toFixed(0)}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
