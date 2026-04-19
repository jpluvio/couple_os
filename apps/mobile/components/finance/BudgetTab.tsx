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
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCouple } from "@/hooks/useCouple";
import type { Budget, Expense } from "@/types/database";

const CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "casa", label: "Casa", emoji: "🏠" },
  { value: "cibo", label: "Cibo", emoji: "🍕" },
  { value: "trasporti", label: "Trasporti", emoji: "🚗" },
  { value: "intrattenimento", label: "Svago", emoji: "🎉" },
  { value: "salute", label: "Salute", emoji: "💊" },
  { value: "altro", label: "Altro", emoji: "📦" },
];

function catInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? { label: cat, emoji: "📦" };
}

function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  const clamped = Math.min(ratio, 1);
  return (
    <View className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
      <View
        className="h-full rounded-full"
        style={{ width: `${clamped * 100}%`, backgroundColor: color }}
      />
    </View>
  );
}

export function BudgetTab() {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budgetsKey = ["budgets", coupleId];
  const expensesKey = ["expenses", coupleId];

  const [showAdd, setShowAdd] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState("cibo");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: budgets, isLoading: loadingBudgets, refetch } = useQuery({
    queryKey: budgetsKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data as Budget[];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: expensesKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("date", `${year}-${String(month).padStart(2, "0")}-01`);
      if (error) throw error;
      return data as Expense[];
    },
  });

  const spentByCategory = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const allCategories = Array.from(
    new Set([...(budgets ?? []).map((b) => b.category), ...Object.keys(spentByCategory)])
  );

  async function saveBudget() {
    const parsed = parseFloat(budgetAmount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Errore", "Inserisci un importo valido.");
      return;
    }
    setLoading(true);
    try {
      if (editBudget) {
        await supabase.from("budgets").update({ amount: parsed }).eq("id", editBudget.id);
      } else {
        const existing = budgets?.find((b) => b.category === category);
        if (existing) {
          await supabase.from("budgets").update({ amount: parsed }).eq("id", existing.id);
        } else {
          await supabase.from("budgets").insert({
            category,
            amount: parsed,
            month,
            year,
            couple_id: coupleId,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: budgetsKey });
      resetForm();
      setShowAdd(false);
    } catch {
      Alert.alert("Errore", "Impossibile salvare il budget.");
    } finally {
      setLoading(false);
    }
  }

  function openEdit(cat: string) {
    const b = budgets?.find((b) => b.category === cat);
    setEditBudget(b ?? null);
    setCategory(cat);
    setBudgetAmount(b ? String(b.amount) : "");
    setShowAdd(true);
  }

  function resetForm() {
    setEditBudget(null);
    setCategory("cibo");
    setBudgetAmount("");
  }

  function handleLongPress(cat: string) {
    const b = budgets?.find((b) => b.category === cat);
    if (!b) return;
    Alert.alert("Budget", `Rimuovere il budget per ${catInfo(cat).label}?`, [
      {
        text: "🗑️ Rimuovi",
        style: "destructive",
        onPress: async () => {
          await supabase.from("budgets").delete().eq("id", b.id);
          queryClient.invalidateQueries({ queryKey: budgetsKey });
        },
      },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  const totalBudget = (budgets ?? []).reduce((s, b) => s + b.amount, 0);
  const totalSpent = (budgets ?? []).reduce((s, b) => s + (spentByCategory[b.category] ?? 0), 0);

  return (
    <View className="flex-1">
      {/* Summary */}
      {(budgets?.length ?? 0) > 0 && (
        <View className="mx-4 mb-3 bg-white rounded-2xl px-4 py-3">
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-500">Totale budget</Text>
            <Text className="text-xs text-gray-500">Speso</Text>
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-lg font-bold text-gray-900">€{totalBudget.toFixed(0)}</Text>
            <Text className={`text-lg font-bold ${totalSpent > totalBudget ? "text-red-500" : "text-emerald-600"}`}>
              €{totalSpent.toFixed(0)}
            </Text>
          </View>
          <ProgressBar
            ratio={totalBudget > 0 ? totalSpent / totalBudget : 0}
            color={totalSpent > totalBudget ? "#ef4444" : "#10b981"}
          />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={loadingBudgets} onRefresh={refetch} tintColor="#10b981" />
        }
      >
        {allCategories.length === 0 && !loadingBudgets ? (
          <View className="items-center py-20 px-8">
            <Text className="text-5xl mb-4">📊</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">Nessun budget impostato</Text>
            <Text className="text-sm text-gray-400 text-center mt-1">
              Imposta un budget mensile per ogni categoria!
            </Text>
          </View>
        ) : (
          allCategories.map((cat) => {
            const info = catInfo(cat);
            const budget = budgets?.find((b) => b.category === cat);
            const spent = spentByCategory[cat] ?? 0;
            const ratio = budget ? spent / budget.amount : null;
            const over = ratio != null && ratio > 1;

            return (
              <Pressable
                key={cat}
                onPress={() => openEdit(cat)}
                onLongPress={() => handleLongPress(cat)}
                className="bg-white mx-4 mb-2 rounded-xl px-4 py-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Text className="text-xl">{info.emoji}</Text>
                    <Text className="text-sm font-semibold text-gray-800">{info.label}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-sm font-bold ${over ? "text-red-500" : "text-gray-900"}`}>
                      €{spent.toFixed(0)}
                      {budget ? (
                        <Text className="text-gray-400 font-normal"> / €{budget.amount.toFixed(0)}</Text>
                      ) : null}
                    </Text>
                    {!budget && (
                      <Text className="text-xs text-gray-400">Nessun budget</Text>
                    )}
                  </View>
                </View>
                {budget && (
                  <ProgressBar
                    ratio={ratio!}
                    color={over ? "#ef4444" : ratio! > 0.8 ? "#f59e0b" : "#10b981"}
                  />
                )}
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
            <Text className="text-base font-semibold text-gray-900">
              {editBudget ? "Modifica budget" : "Nuovo budget"}
            </Text>
            <Pressable
              onPress={saveBudget}
              disabled={!budgetAmount.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${budgetAmount.trim() && !loading ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${budgetAmount.trim() ? "text-white" : "text-gray-400"}`}>Salva</Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 20 }}>
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Budget mensile (€)</Text>
              <TextInput
                className="text-3xl font-bold text-gray-900 border-b border-gray-100 pb-2"
                placeholder="0"
                placeholderTextColor="#d1d5db"
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {!editBudget && (
              <View>
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      className={`flex-row items-center px-3 py-2 rounded-xl border ${
                        category === cat.value ? "bg-emerald-500 border-emerald-500" : "bg-white border-gray-200"
                      }`}
                      style={{ gap: 4 }}
                    >
                      <Text>{cat.emoji}</Text>
                      <Text className={`text-sm font-medium ${category === cat.value ? "text-white" : "text-gray-700"}`}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
