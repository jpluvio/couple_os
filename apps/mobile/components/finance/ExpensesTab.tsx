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
import { useAuth } from "@/hooks/useAuth";
import { EXPENSE_CATEGORIES, categoryInfo } from "@/constants/finance";
import type { Expense, SplitMode } from "@/types/database";

const CATEGORIES = EXPENSE_CATEGORIES;

function catEmoji(cat: string) {
  return categoryInfo(cat).emoji;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

function computeBalance(
  expenses: Expense[],
  userId: string,
  partnerId: string,
  splitMode: SplitMode,
  userSalary: number | null,
  partnerSalary: number | null
) {
  let userPaid = 0;
  let partnerPaid = 0;
  for (const e of expenses) {
    if (e.paid_by_id === userId) userPaid += e.amount;
    else partnerPaid += e.amount;
  }
  const total = userPaid + partnerPaid;
  if (total === 0) return null;

  let userShare: number;
  if (
    splitMode === "PROPORTIONAL" &&
    userSalary != null &&
    partnerSalary != null &&
    userSalary + partnerSalary > 0
  ) {
    userShare = (userSalary / (userSalary + partnerSalary)) * total;
  } else {
    userShare = total / 2;
  }

  const balance = userPaid - userShare;
  return balance;
}

type Props = { partnerName: string | null; partnerSalary: number | null };

export function ExpensesTab({ partnerName, partnerSalary }: Props) {
  const { user } = useAuth();
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";
  const qKey = ["expenses", coupleId];

  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("altro");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidByMe, setPaidByMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("date", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const balance = expenses && user && couple
    ? computeBalance(
        expenses,
        user.id,
        expenses.find((e) => e.paid_by_id !== user.id)?.paid_by_id ?? "",
        couple.split_mode,
        user.salary,
        partnerSalary
      )
    : null;

  async function addExpense() {
    if (!amount.trim() || !coupleId || !user) return;
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      showAlert("Errore", "Inserisci un importo valido.");
      return;
    }
    setLoading(true);
    try {
      await supabase.from("expenses").insert({
        amount: parsed,
        category,
        note: note.trim() || null,
        date,
        paid_by_id: paidByMe ? user.id : (expenses?.find((e) => e.paid_by_id !== user.id)?.paid_by_id ?? user.id),
        couple_id: coupleId,
      });
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ["budgets", coupleId] });
      resetForm();
      setShowAdd(false);
    } catch {
      showAlert("Errore", "Impossibile aggiungere la spesa.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setAmount("");
    setCategory("altro");
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
    setPaidByMe(true);
  }

  function handleLongPress(expense: Expense) {
    showAlert(
      `${catEmoji(expense.category)} ${expense.note ?? expense.category}`,
      `€${expense.amount.toFixed(2)}`,
      [
        {
          text: "🗑️ Elimina",
          style: "destructive",
          onPress: async () => {
            await supabase.from("expenses").delete().eq("id", expense.id);
            queryClient.invalidateQueries({ queryKey: qKey });
            queryClient.invalidateQueries({ queryKey: ["budgets", coupleId] });
          },
        },
        { text: "Annulla", style: "cancel" },
      ]
    );
  }

  const myName = user?.name ?? "Tu";
  const theirName = partnerName ?? "Partner";

  return (
    <View className="flex-1">
      {/* Balance card */}
      {balance !== null && (
        <View className="mx-4 mb-3 bg-white rounded-2xl px-4 py-3">
          {Math.abs(balance) < 0.01 ? (
            <Text className="text-sm text-gray-600 text-center">✅ Siete in pari questo mese</Text>
          ) : balance > 0 ? (
            <Text className="text-sm text-gray-600 text-center">
              {theirName} deve a {myName}{" "}
              <Text className="font-bold text-emerald-600">€{balance.toFixed(2)}</Text>
            </Text>
          ) : (
            <Text className="text-sm text-gray-600 text-center">
              {myName} deve a {theirName}{" "}
              <Text className="font-bold text-red-500">€{Math.abs(balance).toFixed(2)}</Text>
            </Text>
          )}
          <Text className="text-xs text-gray-400 text-center mt-0.5">
            Basato su divisione {couple?.split_mode === "PROPORTIONAL" ? "proporzionale" : "equa"}
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />
        }
      >
        {(!expenses || expenses.length === 0) && !isLoading ? (
          <View className="items-center py-20 px-8">
            <Text className="text-5xl mb-4">💸</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">Nessuna spesa questo mese</Text>
            <Text className="text-sm text-gray-400 text-center mt-1">Aggiungi la prima spesa del mese!</Text>
          </View>
        ) : (
          expenses?.map((expense) => (
            <Pressable
              key={expense.id}
              onLongPress={() => handleLongPress(expense)}
              className="bg-white mx-4 mb-2 rounded-xl px-4 py-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
                <Text className="text-2xl">{catEmoji(expense.category)}</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                    {expense.note ?? CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {formatDate(expense.date)} · {expense.paid_by_id === user?.id ? myName : theirName}
                  </Text>
                </View>
              </View>
              <Text className="text-base font-semibold text-gray-900">€{expense.amount.toFixed(2)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setShowAdd(true)}
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
            <Text className="text-base font-semibold text-gray-900">Nuova spesa</Text>
            <Pressable
              onPress={addExpense}
              disabled={!amount.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${amount.trim() && !loading ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${amount.trim() ? "text-white" : "text-gray-400"}`}>Aggiungi</Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 20 }}>
            {/* Amount */}
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Importo (€)</Text>
              <TextInput
                className="text-3xl font-bold text-gray-900 border-b border-gray-100 pb-2"
                placeholder="0.00"
                placeholderTextColor="#d1d5db"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {/* Note */}
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Descrizione</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="es. Spesa al supermercato"
                placeholderTextColor="#9ca3af"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Category */}
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

            {/* Paid by */}
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pagato da</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {[
                  { label: myName, value: true },
                  { label: theirName, value: false },
                ].map((opt) => (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => setPaidByMe(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      paidByMe === opt.value ? "bg-emerald-500 border-emerald-500" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${paidByMe === opt.value ? "text-white" : "text-gray-700"}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date */}
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data (AAAA-MM-GG)</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="es. 2026-04-19"
                placeholderTextColor="#9ca3af"
                value={date}
                onChangeText={setDate}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
