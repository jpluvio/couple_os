import { useMemo, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useRecurringCatchUp } from "@/hooks/useRecurringExpenses";
import { CategoryPicker } from "./CategoryPicker";
import { PendingRecurringBanner } from "./PendingRecurringBanner";
import { formatCurrency, formatShortDate, parseAmount, todayISO } from "@/lib/format";
import type { Expense } from "@/types/database";

export function ExpensesTab() {
  const { user, coupleId } = useAuth();
  const queryClient = useQueryClient();
  const { byId: categoriesById, active: activeCategories } = useCategories();
  const { active: members, me, byId: membersById, canWrite } = useHouseholdMembers();

  // Post whatever the cron may have missed for this household.
  useRecurringCatchUp();

  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [paidByMemberId, setPaidByMemberId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const monthStart = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  const expensesKey = ["expenses", coupleId];

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: expensesKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("couple_id", coupleId!)
        .gte("date", monthStart)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  function categoryOf(expense: Expense) {
    return expense.category_id ? categoriesById.get(expense.category_id) ?? null : null;
  }

  function payerName(expense: Expense) {
    if (expense.paid_by_member_id) {
      return membersById.get(expense.paid_by_member_id)?.display_name ?? "Someone";
    }
    return expense.paid_by_id === user?.id ? me?.display_name ?? "You" : "Someone";
  }

  function resetForm() {
    setAmount("");
    setCategoryId(activeCategories[0]?.id ?? null);
    setNote("");
    setDate(todayISO());
    setPaidByMemberId(me?.id ?? null);
  }

  function openAdd() {
    if (!canWrite) return;
    resetForm();
    setShowAdd(true);
  }

  async function addExpense() {
    const parsed = parseAmount(amount);
    if (parsed == null || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Pick a category", "Every expense belongs to a category.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        couple_id: coupleId!,
        amount: parsed,
        category_id: categoryId,
        note: note.trim() || null,
        date,
        paid_by_member_id: paidByMemberId ?? me?.id ?? null,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: expensesKey });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      setShowAdd(false);
    } catch (error) {
      Alert.alert("Could not add the expense", (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleLongPress(expense: Expense) {
    if (!canWrite) return;
    const category = categoryOf(expense);
    Alert.alert(
      `${category?.emoji ?? "📦"} ${expense.note ?? category?.label ?? "Expense"}`,
      formatCurrency(expense.amount),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase.from("expenses").delete().eq("id", expense.id);
            queryClient.invalidateQueries({ queryKey: expensesKey });
            queryClient.invalidateQueries({ queryKey: ["finance"] });
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1">
      <PendingRecurringBanner />

      {(expenses?.length ?? 0) > 0 && (
        <View className="mx-4 mb-3 bg-white rounded-2xl px-4 py-3 flex-row justify-between items-baseline">
          <Text className="text-sm text-gray-500">Spent this month</Text>
          <Text className="text-lg font-bold text-gray-900">{formatCurrency(total)}</Text>
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
            <Text className="text-base font-semibold text-gray-700 text-center">
              No expenses this month
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-1">
              Add the first one — it takes five seconds.
            </Text>
          </View>
        ) : (
          expenses?.map((expense) => {
            const category = categoryOf(expense);
            return (
              <Pressable
                key={expense.id}
                onLongPress={() => handleLongPress(expense)}
                className="bg-white mx-4 mb-2 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
                  <Text className="text-2xl">{category?.emoji ?? "📦"}</Text>
                  <View className="flex-1">
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                        {expense.note ?? category?.label ?? "Expense"}
                      </Text>
                      {expense.source === "RECURRING" ? (
                        <View className="bg-gray-100 rounded-md px-1.5 py-0.5">
                          <Text className="text-[10px] font-semibold text-gray-500">AUTO</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {formatShortDate(expense.date)} · {payerName(expense)}
                      {category ? ` · ${category.label}` : ""}
                    </Text>
                  </View>
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  {formatCurrency(expense.amount)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {canWrite && (
        <Pressable
          onPress={openAdd}
          accessibilityLabel="Add an expense"
          className="absolute bottom-8 right-6 w-14 h-14 bg-emerald-500 rounded-full items-center justify-center"
          style={{
            shadowColor: "#10b981",
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>
            +
          </Text>
        </Pressable>
      )}

      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => setShowAdd(false)} className="py-1 px-2">
              <Text className="text-base text-gray-500">Cancel</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">New expense</Text>
            <Pressable
              onPress={addExpense}
              disabled={!amount.trim() || saving}
              className={`py-1.5 px-4 rounded-full ${
                amount.trim() && !saving ? "bg-emerald-500" : "bg-gray-200"
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className={`text-sm font-semibold ${
                    amount.trim() ? "text-white" : "text-gray-400"
                  }`}
                >
                  Add
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 20 }}
          >
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Amount
              </Text>
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

            {/* One mandatory tap beyond the amount: the category. */}
            <CategoryPicker label="Category" value={categoryId} onChange={setCategoryId} />

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Description
              </Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="e.g. weekly shop"
                placeholderTextColor="#9ca3af"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {members.length > 1 && (
              <View>
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Paid by
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 16 }}
                >
                  {members.map((member) => {
                    const selected = (paidByMemberId ?? me?.id) === member.id;
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => setPaidByMemberId(member.id)}
                        className={`px-4 py-2.5 rounded-xl border ${
                          selected ? "bg-emerald-500 border-emerald-500" : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {member.avatar_emoji ? `${member.avatar_emoji} ` : ""}
                          {member.display_name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Date
              </Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TextInput
                  className="flex-1 text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={date}
                  onChangeText={setDate}
                />
                <Pressable
                  onPress={() => setDate(todayISO())}
                  className="px-3 py-2 rounded-xl bg-gray-100"
                >
                  <Text className="text-sm text-gray-600">Today</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setDate(yesterday.toISOString().slice(0, 10));
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100"
                >
                  <Text className="text-sm text-gray-600">Yesterday</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
